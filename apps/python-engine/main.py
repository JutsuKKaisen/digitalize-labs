import os
import fitz
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

    return {
        "pages": pages_data,
        "pageAssetsById": page_assets_by_id,
        "graph": {
            "nodes": graph_nodes,
            "edges": graph_edges
        }
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
