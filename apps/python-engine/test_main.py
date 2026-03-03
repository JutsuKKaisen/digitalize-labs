"""
Tests for the Python OCR Engine (FastAPI app).
Run with: python -m pytest test_main.py -v
"""

import os
import tempfile
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from main import app, extract_entities_and_keywords


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
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)


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
