"""
Tests for the Python OCR Engine (FastAPI app).
Run with: python -m pytest test_main.py -v
"""

import os
import tempfile
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from main import app, extract_entities_and_keywords, inject_wikilinks, hash_text_chunks


client = TestClient(app)


# ============================================================
# Unit Tests: extract_entities_and_keywords
# ============================================================

class TestEntityKeywordExtraction:
    """Tests for the NER + YAKE keyword extraction function."""

    def test_empty_string_returns_empty_list(self):
        result = extract_entities_and_keywords("")
        assert isinstance(result, list)
        assert len(result) == 0

    def test_whitespace_only_returns_empty_list(self):
        result = extract_entities_and_keywords("   ")
        assert isinstance(result, list)
        assert len(result) == 0

    def test_returns_list_of_dicts_with_correct_keys(self):
        result = extract_entities_and_keywords("Hà Nội là thủ đô của Việt Nam với nhiều di tích lịch sử văn hóa")
        if len(result) > 0:
            for node in result:
                assert "label" in node
                assert "type" in node
                assert "weight" in node
                assert isinstance(node["label"], str)
                assert isinstance(node["type"], str)
                assert isinstance(node["weight"], (int, float))

    def test_max_15_nodes_returned(self):
        # A long text should not exceed 15 results
        long_text = "Hà Nội Sài Gòn Đà Nẵng Huế " * 50
        result = extract_entities_and_keywords(long_text)
        assert len(result) <= 15

    def test_deduplication_works(self):
        # Repeating the same entity should not create duplicates
        text = "Hà Nội " * 20
        result = extract_entities_and_keywords(text)
        labels_lower = [n["label"].lower() for n in result]
        assert len(labels_lower) == len(set(labels_lower))


# ============================================================
# API Integration Tests: /process endpoint
# ============================================================

class TestProcessEndpoint:
    """Tests for the /process API endpoint."""

    def test_missing_file_returns_404(self):
        response = client.post("/process", json={
            "docId": "test-doc-1",
            "filePath": "/nonexistent/path/to/file.pdf",
            "outRoot": tempfile.gettempdir(),
        })
        assert response.status_code == 404
        assert "File not found" in response.json()["detail"]

    def test_process_image_file(self):
        """Test processing a simple image file (creates a temp image)."""
        from PIL import Image
        import shutil

        tmpdir = tempfile.mkdtemp()
        try:
            # Create a simple test image with text
            img = Image.new('RGB', (200, 100), color='white')
            img_path = os.path.join(tmpdir, "test.jpg")
            img.save(img_path)
            img.close()

            out_dir = os.path.join(tmpdir, "output")
            os.makedirs(out_dir, exist_ok=True)

            # Mock Tesseract since it may not be installed in CI
            mock_data = {
                'text': ['Hello', 'World', ''],
                'conf': [90, 85, -1],
                'left': [10, 60, 0],
                'top': [10, 10, 0],
                'width': [40, 40, 0],
                'height': [20, 20, 0],
                'line_num': [1, 1, 0],
                'block_num': [1, 1, 0],
                'par_num': [1, 1, 0],
            }

            with patch('main.pytesseract.image_to_data', return_value=mock_data):
                with patch('main.Image.open') as mock_open:
                    mock_img = MagicMock()
                    mock_img.size = (200, 100)
                    mock_img.convert.return_value = mock_img
                    mock_open.return_value = mock_img

                    response = client.post("/process", json={
                        "docId": "test-img",
                        "filePath": img_path,
                        "outRoot": out_dir,
                    })

            assert response.status_code == 200
            data = response.json()
            assert "pages" in data
            assert "pageAssetsById" in data
            assert "graph" in data
            assert len(data["pages"]) == 1
            assert data["pages"][0]["pageNo"] == 1
            # Obsidian enrichment fields
            assert "markdownContent" in data
            assert "detectedEntities" in data
            assert "textChunks" in data
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)


# ============================================================
# Unit Tests: inject_wikilinks (Obsidian-Style Enrichment)
# ============================================================

class TestWikilinkInjection:
    """Tests for the Vietnamese legal entity wikilink injection."""

    def test_empty_string_returns_empty(self):
        result, entities = inject_wikilinks("")
        assert result == ""
        assert entities == []

    def test_none_returns_none(self):
        result, entities = inject_wikilinks(None)
        assert result is None
        assert entities == []

    def test_whitespace_returns_same(self):
        result, entities = inject_wikilinks("   ")
        assert result == "   "
        assert entities == []

    def test_decree_pattern(self):
        """Nghị định 13/2023/NĐ-CP should be wrapped in [[wikilinks]]."""
        text = "Theo Nghị định 13/2023/NĐ-CP về quản lý."
        result, entities = inject_wikilinks(text)
        assert "[[Nghị định 13/2023/NĐ-CP]]" in result
        assert any(e["type"] == "DECREE" for e in entities)

    def test_decree_short_form(self):
        """NĐ 45/2024 should be detected."""
        text = "Căn cứ NĐ 45/2024 ban hành."
        result, entities = inject_wikilinks(text)
        assert "[[NĐ 45/2024]]" in result

    def test_law_with_number(self):
        """Luật số 59/2020/QH14 should be wrapped."""
        text = "Áp dụng Luật số 59/2020/QH14."
        result, entities = inject_wikilinks(text)
        assert "[[Luật số 59/2020/QH14]]" in result
        assert any(e["type"] == "LAW" for e in entities)

    def test_law_named(self):
        """Luật Doanh nghiệp 2020 should be wrapped."""
        text = "Tuân thủ Luật Doanh nghiệp 2020 trong hoạt động."
        result, entities = inject_wikilinks(text)
        assert "[[Luật Doanh nghiệp 2020]]" in result

    def test_circular_pattern(self):
        """Thông tư 36/2023/TT-BTC should be detected."""
        text = "Thông tư 36/2023/TT-BTC quy định thuế."
        result, entities = inject_wikilinks(text)
        assert "[[Thông tư 36/2023/TT-BTC]]" in result
        assert any(e["type"] == "CIRCULAR" for e in entities)

    def test_resolution_pattern(self):
        """Nghị quyết 01/NQ-CP should be detected."""
        text = "Ban hành Nghị quyết 01/NQ-CP."
        result, entities = inject_wikilinks(text)
        assert "[[Nghị quyết 01/NQ-CP]]" in result
        assert any(e["type"] == "RESOLUTION" for e in entities)

    def test_company_pattern(self):
        """Công ty TNHH ABC should be detected."""
        text = "Đại diện là Công ty TNHH ABC Trading."
        result, entities = inject_wikilinks(text)
        assert "[[Công ty TNHH ABC Trading]]" in result
        assert any(e["type"] == "ORG" for e in entities)

    def test_clause_pattern(self):
        """Điều 5 and Khoản 3 Điều 12 should be detected."""
        text = "Theo Điều 5 và Khoản 3 Điều 12."
        result, entities = inject_wikilinks(text)
        assert "[[Điều 5]]" in result
        assert any(e["type"] == "CLAUSE" for e in entities)

    def test_no_double_wrapping(self):
        """Already-wrapped entities should not be re-wrapped."""
        text = "Theo [[Nghị định 13/2023/NĐ-CP]] đã ban hành."
        result, entities = inject_wikilinks(text)
        assert "[[[[" not in result  # No double wrapping

    def test_tag_header_generated(self):
        """Tags should be prepended when entities are found."""
        text = "Nghị định 13/2023 về Điều 5."
        result, entities = inject_wikilinks(text)
        assert "#clause" in result or "#decree" in result

    def test_no_tags_for_plain_text(self):
        """Plain text without legal entities should have no tags."""
        text = "Hôm nay trời đẹp quá."
        result, entities = inject_wikilinks(text)
        assert not result.startswith("#")
        assert len(entities) == 0

    def test_multiple_entities_in_one_text(self):
        """Multiple different entities should all be detected."""
        text = "Căn cứ Nghị định 13/2023 và Luật số 59/2020/QH14 tại Điều 5."
        result, entities = inject_wikilinks(text)
        assert len(entities) >= 3  # At least decree, law, clause

    def test_deduplication(self):
        """Same entity appearing twice should only produce one entry."""
        text = "Nghị định 13/2023 rồi lại Nghị định 13/2023."
        result, entities = inject_wikilinks(text)
        decree_entities = [e for e in entities if e["type"] == "DECREE"]
        assert len(decree_entities) == 1


# ============================================================
# Unit Tests: hash_text_chunks (SHA-256 Paragraph Hashing)
# ============================================================

class TestChunkHashing:
    """Tests for the SHA-256 paragraph chunk hashing."""

    def test_empty_string_returns_empty(self):
        result = hash_text_chunks("")
        assert result == []

    def test_none_returns_empty(self):
        result = hash_text_chunks(None)
        assert result == []

    def test_short_text_skipped(self):
        """Text shorter than min_length should be skipped."""
        result = hash_text_chunks("Short.")
        assert result == []

    def test_deterministic_hash(self):
        """Same text should always produce the same SHA-256 hash."""
        text = "Đây là một đoạn văn bản dài đủ để tạo hash SHA-256."
        result1 = hash_text_chunks(text)
        result2 = hash_text_chunks(text)
        assert len(result1) > 0
        assert result1[0]["hash"] == result2[0]["hash"]

    def test_different_text_different_hash(self):
        """Different texts should produce different hashes."""
        text1 = "Đây là đoạn văn bản thứ nhất có nội dung rất dài."
        text2 = "Đây là đoạn văn bản thứ hai khác hoàn toàn."
        r1 = hash_text_chunks(text1)
        r2 = hash_text_chunks(text2)
        if r1 and r2:
            assert r1[0]["hash"] != r2[0]["hash"]

    def test_paragraph_splitting(self):
        """Double newlines should split into separate chunks."""
        text = "Đoạn một có nội dung dài đủ để hash.\n\nĐoạn hai cũng có nội dung dài đủ."
        result = hash_text_chunks(text)
        assert len(result) == 2
        assert result[0]["hash"] != result[1]["hash"]
        assert result[0]["index"] != result[1]["index"]

    def test_chunk_structure(self):
        """Each chunk should have content, hash, and index keys."""
        text = "Đoạn văn bản dài đủ để tạo ít nhất một chunk hashing."
        result = hash_text_chunks(text)
        if result:
            chunk = result[0]
            assert "content" in chunk
            assert "hash" in chunk
            assert "index" in chunk
            assert len(chunk["hash"]) == 64  # SHA-256 hex length

    def test_custom_min_length(self):
        """Custom min_length should filter short paragraphs."""
        text = "Short.\n\nA much longer paragraph that exceeds the minimum length threshold."
        result = hash_text_chunks(text, min_length=50)
        assert len(result) == 1  # Only the long paragraph


# ============================================================
# Health / Smoke Test
# ============================================================

class TestAppHealth:
    """Basic smoke tests for the FastAPI app."""

    def test_app_starts(self):
        """The app object should be a valid FastAPI instance."""
        assert app is not None
        assert hasattr(app, 'routes')

    def test_openapi_schema_available(self):
        """FastAPI should serve its OpenAPI schema."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        schema = response.json()
        assert "paths" in schema
        assert "/process" in schema["paths"]
