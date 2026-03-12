import os
import re
import fitz
import hashlib
import pytesseract
from PIL import Image
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uuid
import math
import logging

import logging
import yake
from underthesea import ner

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Auto-detect Tesseract on Windows (common install paths)
if os.name == 'nt':
    _tesseract_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expanduser(r"~\AppData\Local\Tesseract-OCR\tesseract.exe"),
    ]
    for _path in _tesseract_paths:
        if os.path.isfile(_path):
            pytesseract.pytesseract.tesseract_cmd = _path
            logger.info(f"Tesseract found at: {_path}")
            break
    else:
        logger.warning(
            "Tesseract not found in default Windows paths. "
            "Install from https://github.com/UB-Mannheim/tesseract/wiki "
            "or set pytesseract.pytesseract.tesseract_cmd manually."
        )

app = FastAPI()

def extract_entities_and_keywords(text: str):
    nodes = []
    
    # 1. NER
    try:
        if text.strip():
            ner_results = ner(text)
            current_entity = ""
            current_type = ""
            
            for word, pos, chunk, label in ner_results:
                if label.startswith('B-'):
                    if current_entity and len(current_entity) > 2:
                        nodes.append({"label": current_entity.replace("_", " ").strip(), "type": current_type, "weight": 1.5})
                    current_type = label[2:]  # 'PER', 'ORG', 'LOC'
                    current_entity = word
                elif label.startswith('I-') and label[2:] == current_type:
                    current_entity += " " + word
                else:
                    if current_entity and len(current_entity) > 2:
                        nodes.append({"label": current_entity.replace("_", " ").strip(), "type": current_type, "weight": 1.5})
                    current_entity = ""
                    current_type = ""
                    
            if current_entity and len(current_entity) > 2:
                nodes.append({"label": current_entity.replace("_", " ").strip(), "type": current_type, "weight": 1.5})
    except Exception as e:
        logger.error(f"NER extraction failed: {e}")

    # 2. YAKE keyword extraction
    try:
        if text.strip():
            kw_extractor = yake.KeywordExtractor(lan="vi", n=2, dedupLim=0.9, top=10, features=None)
            keywords = kw_extractor.extract_keywords(text)
            for kw, score in keywords:
                label = kw.replace("_", " ").strip().title()
                if len(label) > 2:
                    nodes.append({
                        "label": label,
                        "type": "KEYWORD",
                        "weight": round(1.0 / (score + 0.1), 2)
                    })
    except Exception as e:
        logger.error(f"Keyword extraction failed: {e}")

    # Deduplicate nodes by label lowercase
    seen = set()
    final_nodes = []
    
    # Sort nodes so that higher weight objects come first (prioritize NER over low score Yake)
    nodes.sort(key=lambda x: x["weight"], reverse=True)
    
    for n in nodes:
        k = n["label"].lower()
        if k not in seen:
            seen.add(k)
            final_nodes.append(n)
            
    # return top 15 nodes overall
    return final_nodes[:15]


# =====================================================
# Obsidian-Style Wikilink Injection (Vietnamese Legal NLP)
# =====================================================

# Vietnamese legal entity patterns — ordered from most specific to least
LEGAL_PATTERNS = [
    # Decree: "Nghị định 13/2023/NĐ-CP", "NĐ 45/2024"
    (r'(?:Nghị\s+định|NĐ)\s+\d+/\d{4}(?:/NĐ-CP)?', 'DECREE'),
    # Law: "Luật số 59/2020/QH14", "Luật Doanh nghiệp 2020"
    (r'Luật\s+số\s+\d+/\d{4}(?:/QH\d+)?', 'LAW'),
    (r'Luật\s+[A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[a-zà-ỹA-ZÀ-Ỹ]+)*(?:\s+\d{4})?', 'LAW'),
    # Circular: "Thông tư 36/2023/TT-BTC"
    (r'Thông\s+tư\s+\d+/\d{4}(?:/TT-[A-Z]+)?', 'CIRCULAR'),
    # Resolution: "Nghị quyết 01/NQ-CP"
    (r'Nghị\s+quyết\s+\d+(?:/\d{4})?(?:/NQ-[A-Z]+)?', 'RESOLUTION'),
    # Company: "Công ty TNHH ABC", "CTCP XYZ"
    (r'(?:Công\s+ty\s+(?:TNHH|CP|Cổ\s+phần)|CTCP|CT\s+TNHH)\s+[A-ZÀ-Ỹ][^\.,\n]{3,40}', 'ORG'),
    # Article/Clause: "Khoản 3 Điều 12", "Điều 5"
    (r'(?:Khoản\s+\d+\s+)?Điều\s+\d+', 'CLAUSE'),
]


def inject_wikilinks(text: str) -> tuple:
    """
    Scan raw OCR text for Vietnamese legal entities and wrap them in [[wikilinks]].
    Also prepends #tags for entity types found.
    Returns (enriched_markdown, detected_entities).
    """
    if not text or not text.strip():
        return text, []

    entities = []
    seen = set()

    for pattern, etype in LEGAL_PATTERNS:
        for match in re.finditer(pattern, text):
            entity_text = match.group().strip()
            key = entity_text.lower()
            if key not in seen:
                seen.add(key)
                entities.append({
                    "text": entity_text,
                    "type": etype,
                    "start": match.start(),
                    "end": match.end()
                })

    # Sort by position descending to replace without offset issues
    entities.sort(key=lambda e: e["start"], reverse=True)
    enriched = text
    for ent in entities:
        original = enriched[ent["start"]:ent["end"]]
        # Don't double-wrap already-wrapped entities
        before = enriched[max(0, ent["start"] - 2):ent["start"]]
        if before.endswith('[['):
            continue
        enriched = enriched[:ent["start"]] + f'[[{original}]]' + enriched[ent["end"]:]

    # Add tag header with entity type tags
    type_tags = set(e["type"] for e in entities)
    if type_tags:
        tag_line = " ".join(f"#{t.lower()}" for t in sorted(type_tags))
        enriched = tag_line + "\n\n" + enriched

    # Re-sort entities by position ascending for return
    entities.sort(key=lambda e: e["start"])
    return enriched, entities


# =====================================================
# SHA-256 Paragraph Chunk Hashing
# =====================================================

def hash_text_chunks(text: str, min_length: int = 20) -> list:
    """
    Split text into paragraph-level chunks and compute SHA-256 hashes.
    Returns list of {content, hash, index} for deduplication across documents.
    """
    if not text or not text.strip():
        return []

    # Split by double newline (paragraphs)
    paragraphs = re.split(r'\n\s*\n', text)
    chunks = []
    for i, para in enumerate(paragraphs):
        para = para.strip()
        if len(para) < min_length:
            continue
        content_hash = hashlib.sha256(para.encode('utf-8')).hexdigest()
        chunks.append({
            "content": para,
            "hash": content_hash,
            "index": i
        })
    return chunks


class ProcessRequest(BaseModel):
    docId: str
    filePath: str
    outRoot: str  # public/mock directory

@app.post("/process")
def process_document(req: ProcessRequest):
    if not os.path.exists(req.filePath):
        raise HTTPException(status_code=404, detail="File not found")

    out_dir = os.path.join(req.outRoot, req.docId)
    os.makedirs(out_dir, exist_ok=True)

    ext = os.path.splitext(req.filePath)[1].lower()
    is_image = ext in [".jpg", ".jpeg", ".png"]

    pages_data = []
    page_assets_by_id = {}

    try:
        if is_image:
            # Handle image fallback
            img = Image.open(req.filePath)
            width, height = img.size
            
            # Save a copy for web
            page_img_path = os.path.join(out_dir, f"page-1.jpg")
            img.convert("RGB").save(page_img_path, "JPEG")
            img_url = f"/mock/{req.docId}/page-1.jpg"
            
            page_id = f"{req.docId}-page-1"
            pages_data.append({
                "id": page_id,
                "pageNo": 1,
                "imageUrl": img_url,
                "width": width,
                "height": height,
                "needsReview": False
            })
            
            lines, tokens = extract_with_tesseract(req.filePath, page_id)
            page_assets_by_id[page_id] = {"lines": lines, "tokens": tokens}
            
        else:
            # Handle PDF with PyMuPDF
            doc = fitz.open(req.filePath)
            for page_idx in range(len(doc)):
                page = doc[page_idx]
                page_no = page_idx + 1
                page_id = f"{req.docId}-page-{page_no}"
                
                # Render page to image
                zoom = 2.0  # Increase resolution
                mat = fitz.Matrix(zoom, zoom)
                pix = page.get_pixmap(matrix=mat)
                
                page_img_path = os.path.join(out_dir, f"page-{page_no}.jpg")
                pix.save(page_img_path)
                
                img_url = f"/mock/{req.docId}/page-{page_no}.jpg"
                
                width_px = pix.width
                height_px = pix.height
                
                pages_data.append({
                    "id": page_id,
                    "pageNo": page_no,
                    "imageUrl": img_url,
                    "width": width_px,
                    "height": height_px,
                    "needsReview": False
                })
                
                lines, tokens = extract_with_pymupdf(page, page_id, zoom)
                
                if len(tokens) < 5:  # Fallback to Tesseract if little text found (e.g., scanned PDF)
                    logger.info(f"Page {page_no} has little text, falling back to Tesseract.")
                    lines, tokens = extract_with_tesseract(page_img_path, page_id)
                
                page_assets_by_id[page_id] = {"lines": lines, "tokens": tokens}
                
            doc.close()

    except Exception as e:
        logger.error(f"Error processing document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    full_text = []
    for page_id, assets in page_assets_by_id.items():
        for line in assets.get("lines", []):
            full_text.append(line.get("textOcr", ""))
    
    combined_text = " ".join(full_text)
    
    graph_nodes = extract_entities_and_keywords(combined_text)
    
    graph_edges = []
    for node in graph_nodes:
        graph_edges.append({
            "nodeLabel": node["label"],
            "nodeType": node["type"],
            "weight": node["weight"]
        })

    # Obsidian enrichment: wikilink injection + chunk hashing
    enriched_text, detected_entities = inject_wikilinks(combined_text)
    text_chunks = hash_text_chunks(combined_text)

    # Merge regex-detected entities into graph_nodes (avoid duplicates)
    existing_labels = set(n["label"].lower() for n in graph_nodes)
    for ent in detected_entities:
        if ent["text"].lower() not in existing_labels:
            existing_labels.add(ent["text"].lower())
            graph_nodes.append({
                "label": ent["text"],
                "type": ent["type"],
                "weight": 2.0  # Legal entities get high weight
            })
            graph_edges.append({
                "nodeLabel": ent["text"],
                "nodeType": ent["type"],
                "weight": 2.0
            })

    return {
        "pages": pages_data,
        "pageAssetsById": page_assets_by_id,
        "graph": {
            "nodes": graph_nodes,
            "edges": graph_edges
        },
        # Obsidian enrichment outputs
        "markdownContent": enriched_text,
        "detectedEntities": detected_entities,
        "textChunks": text_chunks
    }

def extract_with_pymupdf(page, page_id, zoom=2.0):
    blocks = page.get_text("dict")["blocks"]
    lines_list = []
    tokens_list = []
    
    line_count = 1
    token_count = 1
    
    for b in blocks:
        if b["type"] == 0:  # text block
            for l in b["lines"]:
                lx0, ly0, lx1, ly1 = l["bbox"]
                line_text = ""
                
                line_id = f"{page_id}-line-{line_count}"
                current_line_tokens = []
                
                for s in l["spans"]:
                    text = s["text"].strip()
                    if not text:
                        continue
                    
                    # Split span text into words. Assuming approximate bbox splitting.
                    words = text.split()
                    if not words:
                        continue
                        
                    sx0, sy0, sx1, sy1 = s["bbox"]
                    total_chars = len(text)
                    char_width = (sx1 - sx0) / max(total_chars, 1)
                    
                    cur_x = sx0
                    for word in words:
                        w_len = len(word)
                        wx0 = cur_x
                        wx1 = cur_x + (w_len * char_width)
                        
                        token_id = f"{page_id}-token-{token_count}"
                        current_line_tokens.append({
                            "id": token_id,
                            "lineId": line_id,
                            "tokenNo": token_count,
                            "bbox": {
                                "x": round(wx0 * zoom),
                                "y": round(sy0 * zoom),
                                "w": round((wx1 - wx0) * zoom),
                                "h": round((sy1 - sy0) * zoom)
                            },
                            "textOcr": word,
                            "textVerified": None,
                            "confidence": 1.0,
                            "bboxHeuristic": False
                        })
                        token_count += 1
                        
                        # Add space width
                        cur_x = wx1 + char_width
                        
                if current_line_tokens:
                    # Calculate line bbox from tokens
                    lx = min(t["bbox"]["x"] for t in current_line_tokens)
                    ly = min(t["bbox"]["y"] for t in current_line_tokens)
                    lw = max(t["bbox"]["x"] + t["bbox"]["w"] for t in current_line_tokens) - lx
                    lh = max(t["bbox"]["y"] + t["bbox"]["h"] for t in current_line_tokens) - ly
                    
                    lines_list.append({
                        "id": line_id,
                        "lineNo": line_count,
                        "bbox": {"x": lx, "y": ly, "w": lw, "h": lh},
                        "textOcr": " ".join(t["textOcr"] for t in current_line_tokens)
                    })
                    tokens_list.extend(current_line_tokens)
                    line_count += 1
                    
    return lines_list, tokens_list

def extract_with_tesseract(img_path, page_id):
    try:
        data = pytesseract.image_to_data(Image.open(img_path), output_type=pytesseract.Output.DICT)
    except Exception as e:
        logger.error(f"Tesseract failed: {e}")
        return [], []
        
    lines_list = []
    tokens_list = []
    
    line_map = {}
    
    token_count = 1
    for i in range(len(data['text'])):
        text = data['text'][i].strip()
        if not text:
            continue
            
        conf = int(data['conf'][i])
        if conf < 10:  # Ignore very low confidence
            continue
            
        x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
        line_num = data['line_num'][i]
        block_num = data['block_num'][i]
        par_num = data['par_num'][i]
        
        line_key = f"{block_num}_{par_num}_{line_num}"
        if line_key not in line_map:
            line_map[line_key] = {"tokens": [], "lineId": f"{page_id}-line-{len(line_map) + 1}"}
        
        line_info = line_map[line_key]
        token_id = f"{page_id}-token-{token_count}"
        
        token = {
            "id": token_id,
            "lineId": line_info["lineId"],
            "tokenNo": token_count,
            "bbox": {"x": x, "y": y, "w": w, "h": h},
            "textOcr": text,
            "textVerified": None,
            "confidence": conf / 100.0,
            "bboxHeuristic": True
        }
        line_info["tokens"].append(token)
        tokens_list.append(token)
        token_count += 1
        
    line_count = 1
    for line_key, line_info in line_map.items():
        tokens = line_info["tokens"]
        if not tokens:
            continue
            
        lx = min(t["bbox"]["x"] for t in tokens)
        ly = min(t["bbox"]["y"] for t in tokens)
        lw = max(t["bbox"]["x"] + t["bbox"]["w"] for t in tokens) - lx
        lh = max(t["bbox"]["y"] + t["bbox"]["h"] for t in tokens) - ly
        
        lines_list.append({
            "id": line_info["lineId"],
            "lineNo": line_count,
            "bbox": {"x": lx, "y": ly, "w": lw, "h": lh},
            "textOcr": " ".join(t["textOcr"] for t in tokens)
        })
        line_count += 1
        
    return lines_list, tokens_list
