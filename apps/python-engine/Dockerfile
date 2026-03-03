FROM python:3.11-slim

# Cài đặt các dependencies hệ thống (bao gồm Tesseract và thư viện xử lý đồ họa)
# Sửa libgl1-mesa-glx thành libgl1 và libglib2.0-0
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-vie \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Tải trước model underthesea để tránh bị timeout/tốn thời gian khi run lần đầu
RUN python -c "from underthesea import ner; ner('test')" || true

COPY main.py .

EXPOSE 8000

# Khởi chạy FastAPI bằng uvicorn với 2 workers cho Production
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]