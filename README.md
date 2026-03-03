# Digitalize Labs — Monorepo v0.1.3

> **The Deployment Bible**
>
> This document covers everything from local development to production deployment on Ubuntu 22.04 VPS. Read it top to bottom before attempting any deployment.
>
> **Last Updated:** 2026-03-03

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Prerequisites](#2-prerequisites)
3. [Repository Structure](#3-repository-structure)
4. [Environment Variables (.env)](#4-environment-variables-env)
5. [Local Development](#5-local-development)
6. [Database Management](#6-database-management)
7. [Running the Python Engine Locally](#7-running-the-python-engine-locally)
8. [Production Deployment (Dockerized)](#8-production-deployment-dockerized)
9. [Nginx Reverse Proxy Configuration](#9-nginx-reverse-proxy-configuration)
10. [SSL Certificates (Let's Encrypt)](#10-ssl-certificates-lets-encrypt)
11. [Maintenance & Operations](#11-maintenance--operations)
12. [Troubleshooting Guide](#12-troubleshooting-guide)
13. [Rollback Procedures](#13-rollback-procedures)
14. [Security Checklist](#14-security-checklist)

---

## 1. System Overview

Digitalize Labs is a document digitization platform consisting of:

| Service | Technology | Port | Domain (Production) |
|---------|-----------|------|---------------------|
| **Webapp** | Next.js 14 | 3000 | `app.digitalizelabs.vn` |
| **Landing Page** | Next.js 14 | 3001 | `digitalizelabs.vn` |
| **Admin Portal** | Next.js 14 | 3002 | `admin.digitalizelabs.vn` |
| **Python Engine** | FastAPI | 8000 | Internal only (not exposed publicly) |
| **PostgreSQL** | PostgreSQL 16 | 5432 | Internal only |

### Architecture Diagram

```
                            ┌─── INTERNET ───┐
                            │                 │
                       ┌────▼────┐            │
                       │  NGINX  │            │
                       │ :80/:443│            │
                       └────┬────┘            │
            ┌───────────────┼───────────────┐ │
            │               │               │ │
   ┌────────▼──────┐ ┌──────▼───────┐ ┌─────▼──────────┐
   │  Landing Page │ │   Webapp     │ │  Admin Portal  │
   │   :3001       │ │   :3000      │ │   :3002        │
   └───────────────┘ └──────┬───────┘ └────────────────┘
                            │ HTTP (internal)
                     ┌──────▼───────┐
                     │ Python Engine│
                     │   :8000      │
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │  PostgreSQL  │
                     │   :5432      │
                     └──────────────┘
```

> ⚠️ **IMPORTANT:** The Python Engine is called exclusively by the Webapp backend over the Docker internal network. It should NEVER be exposed to the internet.

---

## 2. Prerequisites

### For Local Development (Windows/macOS/Linux)

| Tool | Version | Installation |
|------|---------|-------------|
| **Node.js** | 20.x LTS | [nodejs.org](https://nodejs.org) |
| **PNPM** | 9.0.0 | `npm install -g pnpm@9.0.0` |
| **Python** | 3.10+ | [python.org](https://python.org) |
| **Tesseract OCR** | 5.x | See below |
| **PostgreSQL** | 16 | Via Docker or native install |
| **Docker** | Latest | [docker.com](https://docker.com) (for running PostgreSQL) |

#### Installing Tesseract OCR

Tesseract is required for the Python Engine's OCR fallback on scanned documents.

**Windows:**
```powershell
# Download installer from: https://github.com/UB-Mannheim/tesseract/wiki
# After install, add to PATH:
# C:\Program Files\Tesseract-OCR
# Verify:
tesseract --version
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install -y tesseract-ocr tesseract-ocr-vie
# The 'vie' package adds Vietnamese language data
tesseract --version
```

**macOS:**
```bash
brew install tesseract tesseract-lang
tesseract --version
```

> ⚠️ **CAUTION:** Without Tesseract installed, the Python Engine will fail when processing scanned PDFs or images. Native PDF text extraction (PyMuPDF) will still work, but any page with fewer than 5 detected tokens will trigger the Tesseract fallback and crash.

### For Production Server (Ubuntu 22.04 VPS)

| Tool | Version | Installation |
|------|---------|-------------|
| **Docker** | 24+ | See [Docker install guide](https://docs.docker.com/engine/install/ubuntu/) |
| **Docker Compose** | v2+ | Included with Docker Engine |
| **Nginx** | Latest | `sudo apt install nginx` |
| **Certbot** | Latest | `sudo apt install certbot python3-certbot-nginx` |
| **Git** | Latest | `sudo apt install git` |

#### VPS Minimum Specifications

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Storage | 40 GB SSD | 80 GB SSD |
| Bandwidth | 1 TB/mo | Unlimited |

> ⚠️ **CAUTION:** The Python Engine (especially Underthesea NER + Tesseract) is memory-intensive. With < 4GB RAM, you risk OOM kills during document processing. Consider adding swap space:
> ```bash
> sudo fallocate -l 4G /swapfile
> sudo chmod 600 /swapfile
> sudo mkswap /swapfile
> sudo swapon /swapfile
> echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
> ```

---

## 3. Repository Structure

```
dl/
├── apps/
│   ├── webapp/          # Main document processing app (port 3000)
│   ├── landingpage/     # Marketing site (port 3001)
│   ├── admin/           # Admin dashboard (port 3002)
│   └── python-engine/   # FastAPI OCR/NLP service (port 8000)
├── packages/
│   ├── database/        # Shared Prisma client (@dl/database)
│   └── ui/              # Shared React components (@dl/ui)
├── docker-compose.yml   # Docker orchestration
├── Dockerfile           # Container build instructions
├── turbo.json           # Turborepo pipeline configuration
├── pnpm-workspace.yaml  # PNPM workspace definition
├── package.json         # Root scripts
└── .env                 # Environment variables (NOT committed to git)
```

---

## 4. Environment Variables (.env)

Create a `.env` file in the repository root. This file is **never committed** to Git (it's in `.gitignore`).

```env
# ============================================================
# .env.example — Digitalize Labs Monorepo
# ============================================================
# Copy this file to .env and fill in the values.
# ============================================================

# ---- DATABASE ----
# Local development:
DATABASE_URL="postgresql://dl_user:dl_password@localhost:5432/digitalize_labs"
# Docker production (use container name):
# DATABASE_URL="postgresql://dl_user:dl_password@postgres:5432/digitalize_labs"

# ---- PYTHON ENGINE URL ----
# Local development:
PYTHON_ENGINE_URL="http://127.0.0.1:8000"
# Docker production (use container name):
# PYTHON_ENGINE_URL="http://python-engine:8000"

# ---- PUBLIC FLAGS ----
# Set to "true" to use mock data (bypasses database). ALWAYS "false" in production.
NEXT_PUBLIC_USE_MOCK="false"

# Base URL for client-side API calls. Leave empty in production (same-origin).
# For local dev, set to the webapp URL:
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000"

# Maximum nodes displayed in the knowledge graph (performance tuning):
NEXT_PUBLIC_DEFAULT_MAX_GRAPH_NODES="500"

# ---- AI / GEMINI ----
# Google Gemini API key for AI-powered document extraction.
# Leave empty to disable AI extraction feature.
GEMINI_API_KEY=""

# ---- SECURITY ----
# Secret token for the cron cleanup endpoint (/api/cron/cleanup).
# Generate a strong random string: openssl rand -hex 32
CRON_SECRET="CHANGE_ME_TO_A_RANDOM_STRING"
```

### Variable Details

| Variable | Where Used | Caution |
|----------|-----------|---------|
| `DATABASE_URL` | All apps via `@dl/database` | **Must match** between all services. In Docker, use `postgres` (the service name), NOT `localhost`. |
| `PYTHON_ENGINE_URL` | `apps/webapp/lib/processDocument.ts` | ⚠️ Currently **hardcoded** as `http://127.0.0.1:8000`. You must refactor this file to use `process.env.PYTHON_ENGINE_URL` before Docker deployment. |
| `GEMINI_API_KEY` | `apps/webapp/lib/gemini.ts` | Server-side only. Never prefix with `NEXT_PUBLIC_`. If empty, AI extraction will fail silently. |
| `CRON_SECRET` | `apps/webapp/app/api/cron/` | Used as a Bearer token. Without this, anyone can trigger the cleanup endpoint. |
| `NEXT_PUBLIC_*` | Client-side bundles | These values are baked into the JavaScript bundle at **build time**. Changing them requires a rebuild. |

> ⚠️ **CRITICAL:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. NEVER put secrets (API keys, passwords, tokens) in `NEXT_PUBLIC_*` variables.

---

## 5. Local Development

### Step 1: Clone and Install Dependencies

```bash
git clone <repo-url> dl
cd dl

# Install all workspace dependencies from root
pnpm install
```

> ⚠️ **CAUTION — Common Errors:**
> - **`ENOWORKSPACES`**: You ran `npm install` instead of `pnpm install`, or ran it inside a subdirectory. Always run from the **monorepo root**.
> - **`ERR_PNPM_OUTDATED_LOCKFILE`**: Run `pnpm install --no-frozen-lockfile` (dev only, never in CI).
> - **Missing `node_modules` in a workspace**: Run `pnpm install` from root. Never `cd` into a workspace and run install separately.

### Step 2: Start PostgreSQL

The easiest way is via Docker:

```bash
# Start only the PostgreSQL container
docker compose up -d postgres
```

This starts PostgreSQL on `localhost:5432` with:
- User: `dl_user`
- Password: `dl_password`
- Database: `digitalize_labs`

> ⚠️ **CAUTION:** If port 5432 is already in use (e.g., a local PostgreSQL installation), either stop the local service or change the port mapping in `docker-compose.yml`.

### Step 3: Initialize the Database

```bash
# Generate the Prisma client (MUST run first)
pnpm run db:generate

# Push the schema to the database (creates tables)
pnpm run db:push

# Seed admin accounts (optional but recommended)
pnpm run db:seed
```

**After seeding, you'll have these admin accounts:**

| Email | Password | Role |
|-------|----------|------|
| `admin@digitalizelabs.vn` | `Admin@2026!` | superadmin |
| `manager@digitalizelabs.vn` | `Manager@2026!` | admin |
| `reviewer@digitalizelabs.vn` | `Reviewer@2026!` | admin |

> ⚠️ **SECURITY:** Change these passwords before deploying to production! Edit `packages/database/prisma/seed.ts`.

### Step 4: Start the Python Engine

Open a **separate terminal**:

```bash
cd apps/python-engine

# Create virtual environment (first time only)
python -m venv venv

# Activate it
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows CMD:
.\venv\Scripts\activate.bat
# Linux/macOS:
source venv/bin/activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```

Verify it's running: Open `http://localhost:8000/docs` — you should see the FastAPI Swagger UI.

> ⚠️ **CAUTION:**
> - The Python engine must be running BEFORE you try to upload/process documents in the webapp.
> - If Tesseract is not installed on your machine, you'll see `TesseractNotFoundError` when processing scanned PDFs.
> - The `--reload` flag is for development only. Do NOT use it in production.

### Step 5: Start All Next.js Apps

```bash
# From the monorepo root — starts webapp, admin, and landingpage simultaneously
pnpm run dev
```

Or start individual apps:
```bash
pnpm run dev:webapp      # http://localhost:3000
pnpm run dev:landing     # http://localhost:3001
pnpm run dev:admin       # http://localhost:3002
```

> ⚠️ **CAUTION — Port Conflicts:**
> - Webapp: 3000, Landing Page: 3001, Admin: 3002, Python Engine: 8000
> - If any port is occupied, the app will fail silently or pick a random port.
> - Check with: `netstat -ano | findstr :3000` (Windows) or `lsof -i :3000` (Linux/macOS)

### Step 6: Verify Everything Works

| Check | URL | Expected |
|-------|-----|----------|
| Webapp loads | `http://localhost:3000` | Document list page |
| Landing page loads | `http://localhost:3001` | Marketing page |
| Admin login works | `http://localhost:3002/login` | Login form |
| Python engine responds | `http://localhost:8000/docs` | Swagger UI |
| Database connected | Upload a PDF in webapp | Document appears in list |

---

## 6. Database Management

All database commands are run from the **monorepo root**:

```bash
# Generate Prisma Client (after schema changes)
pnpm run db:generate

# Push schema to DB (dev only — no migration history)
pnpm run db:push

# Create a named migration (production changes)
pnpm run db:migrate

# Seed the database with admin accounts
pnpm run db:seed

# Open Prisma Studio (visual DB editor)
pnpm run db:studio
```

### Schema Change Workflow

> ⚠️ **THIS IS CRITICAL. Follow this exact process:**

1. **Edit** `packages/database/prisma/schema.prisma`
2. **Generate** the client: `pnpm run db:generate`
3. **For development:** `pnpm run db:push` (direct push, no migration file)
4. **For production:** `pnpm run db:migrate` (creates a migration file in `prisma/migrations/`)
5. **Test** your changes thoroughly
6. **Commit** (the migration file will be tracked in git)

> ⚠️ **NEVER** use `db:push` in production. It can cause data loss if you rename or remove columns. Always use `db:migrate` for production changes.

### Accessing Prisma Studio

```bash
pnpm run db:studio
# Opens at http://localhost:5555
```

> ⚠️ **CAUTION:** Prisma Studio has **full write access** to the database. Be extremely careful when editing data directly.

---

## 7. Running the Python Engine Locally

### System Dependencies

The Python engine requires these system-level packages:

| Package | Required For | Test Command |
|---------|-------------|-------------|
| `tesseract-ocr` | OCR on scanned documents | `tesseract --version` |
| `python3` | Python runtime | `python --version` |
| `pip` | Python package manager | `pip --version` |

### Python Dependencies (`requirements.txt`)

```
fastapi          # HTTP API framework
uvicorn          # ASGI server
pymupdf          # PDF rendering (import as 'fitz')
pytesseract      # Tesseract OCR wrapper
Pillow           # Image processing
python-multipart # File upload handling
yake             # Keyword extraction
underthesea      # Vietnamese NLP (NER, segmentation)
```

### How the Engine Works

1. Webapp sends `POST /process` with `{ docId, filePath, outRoot }`
2. Engine opens the PDF with PyMuPDF
3. For each page:
   - Renders to JPG at 2x zoom
   - Extracts text blocks, lines, words with bounding boxes
   - If < 5 tokens found → falls back to Tesseract OCR
4. Full text is assembled and passed through:
   - **Underthesea NER** → extracts PER, ORG, LOC entities
   - **YAKE** → extracts top 10 Vietnamese keywords
5. Returns JSON with pages, assets, and graph data

> ⚠️ **CAUTION — First Run:** The `underthesea` library downloads NLP models on first use (~200MB). This can take several minutes and requires internet access.

---

## 8. Production Deployment (Dockerized)

> ⚠️ **IMPORTANT — Before You Begin:**
> The current `Dockerfile` and `docker-compose.yml` are **incomplete** for the monorepo architecture. They need to be updated to support multi-app builds. The instructions below describe the **target architecture**.

### Pre-Deployment Checklist

- [ ] Updated `processDocument.ts` to use `PYTHON_ENGINE_URL` env var instead of hardcoded URL
- [ ] Created Dockerfiles for each app (or a single multi-stage Dockerfile with Turborepo `turbo prune`)
- [ ] Created a Dockerfile for `python-engine` (with `tesseract-ocr` installed)
- [ ] Updated `docker-compose.yml` with all 5 services
- [ ] Changed default admin passwords in `prisma/seed.ts`
- [ ] Set strong `CRON_SECRET`
- [ ] Set up DNS A records for all subdomains
- [ ] Configured firewall (UFW) to allow only ports 22, 80, 443

### Target `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: dl-postgres
    restart: always
    environment:
      POSTGRES_USER: dl_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-dl_password}
      POSTGRES_DB: digitalize_labs
    ports:
      - "127.0.0.1:5432:5432"   # Bind to localhost only — not exposed to internet
    volumes:
      - pgdata:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          memory: 1G
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dl_user -d digitalize_labs"]
      interval: 10s
      timeout: 5s
      retries: 5

  python-engine:
    build:
      context: ./apps/python-engine
      dockerfile: Dockerfile
    container_name: dl-python-engine
    restart: always
    ports:
      - "127.0.0.1:8000:8000"   # Internal only
    volumes:
      - uploads:/app/uploads
      - mock_data:/app/public/mock
    deploy:
      resources:
        limits:
          memory: 2G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/docs"]
      interval: 30s
      timeout: 10s
      retries: 3

  webapp:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        APP_NAME: webapp
    container_name: dl-webapp
    restart: always
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      - DATABASE_URL=postgresql://dl_user:${POSTGRES_PASSWORD:-dl_password}@postgres:5432/digitalize_labs
      - PYTHON_ENGINE_URL=http://python-engine:8000
      - NEXT_PUBLIC_USE_MOCK=false
      - GEMINI_API_KEY=${GEMINI_API_KEY:-}
      - CRON_SECRET=${CRON_SECRET:-}
    volumes:
      - uploads:/app/uploads
      - mock_data:/app/public/mock
    depends_on:
      postgres:
        condition: service_healthy
      python-engine:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 2G

  landingpage:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        APP_NAME: landingpage
    container_name: dl-landingpage
    restart: always
    ports:
      - "127.0.0.1:3001:3000"  # Internal 3000 mapped to host 3001
    environment:
      - DATABASE_URL=postgresql://dl_user:${POSTGRES_PASSWORD:-dl_password}@postgres:5432/digitalize_labs
    depends_on:
      postgres:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 512M

  admin:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        APP_NAME: admin
    container_name: dl-admin
    restart: always
    ports:
      - "127.0.0.1:3002:3000"  # Internal 3000 mapped to host 3002
    environment:
      - DATABASE_URL=postgresql://dl_user:${POSTGRES_PASSWORD:-dl_password}@postgres:5432/digitalize_labs
    depends_on:
      postgres:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 512M

volumes:
  pgdata:
  uploads:
  mock_data:
```

> ⚠️ **CRITICAL NOTES:**
> - All ports bind to `127.0.0.1` — they are NOT accessible from the internet. Only Nginx (on port 80/443) is public-facing.
> - The `POSTGRES_PASSWORD` should be set via environment variable, not hardcoded in the compose file.
> - `python-engine` gets 2GB memory limit because NLP model loading is memory-intensive.

### Target Python Engine Dockerfile (`apps/python-engine/Dockerfile`)

```dockerfile
FROM python:3.11-slim

# Install system dependencies including Tesseract
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-vie \
    libgl1-mesa-glx \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download underthesea models (avoids runtime download)
RUN python -c "from underthesea import ner; ner('test')" || true

COPY main.py .

EXPOSE 8000

# Production: no --reload, use multiple workers
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

### Build & Deploy Commands

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Clone the repository
git clone <repo-url> /var/www/digitalize-labs
cd /var/www/digitalize-labs

# Create production .env
cp .env.example .env
nano .env   # Edit with production values

# Build all containers
docker compose build

# Start everything
docker compose up -d

# Check all containers are running
docker compose ps

# Initialize the database (first time only)
docker compose exec webapp pnpm run db:push
docker compose exec webapp pnpm run db:seed

# Verify logs
docker compose logs -f --tail=50
```

> ⚠️ **CAUTION — Build Times:**
> - First build can take 10-20 minutes (downloading npm packages, Python ML models, etc.)
> - Subsequent builds with Docker cache are much faster
> - If build fails with "killed" or "signal 9", you're running out of RAM. Add swap space (see Prerequisites).

---

## 9. Nginx Reverse Proxy Configuration

### Install Nginx

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
```

### Server Block Configuration

Create the Nginx config file:

```bash
sudo nano /etc/nginx/sites-available/digitalizelabs
```

Paste the following:

```nginx
# ============================================================
# Digitalize Labs — Nginx Reverse Proxy Configuration
# ============================================================
# This file configures three subdomains:
#   - digitalizelabs.vn        → Landing Page (port 3001)
#   - app.digitalizelabs.vn    → Webapp (port 3000)
#   - admin.digitalizelabs.vn  → Admin Portal (port 3002)
# ============================================================

# ---- LANDING PAGE ----
server {
    listen 80;
    listen [::]:80;
    server_name digitalizelabs.vn www.digitalizelabs.vn;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static assets caching
    location /_next/static {
        proxy_pass http://127.0.0.1:3001;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable";
    }
}

# ---- WEBAPP ----
server {
    listen 80;
    listen [::]:80;
    server_name app.digitalizelabs.vn;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Allow large file uploads (PDFs can be big)
    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Longer timeouts for document processing
        proxy_connect_timeout 120s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Static assets caching
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable";
    }

    # Mock images (rendered document pages)
    location /mock/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
}

# ---- ADMIN PORTAL ----
server {
    listen 80;
    listen [::]:80;
    server_name admin.digitalizelabs.vn;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;

    # Restrict access by IP (optional but recommended)
    # allow 1.2.3.4;      # Your office IP
    # allow 5.6.7.8;      # Your home IP
    # deny all;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /_next/static {
        proxy_pass http://127.0.0.1:3002;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable";
    }
}
```

### Enable the Configuration

```bash
# Create symlink to enable the site
sudo ln -s /etc/nginx/sites-available/digitalizelabs /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm -f /etc/nginx/sites-enabled/default

# Test the configuration for syntax errors
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

> ⚠️ **CAUTION:**
> - Always run `nginx -t` before reloading. A syntax error will take down ALL sites.
> - The admin portal has stricter security headers (X-Frame-Options: DENY, CSP). Uncomment the IP restriction block for maximum security.
> - The webapp has `client_max_body_size 100M` for PDF uploads. Adjust based on your needs.
> - Timeouts for the webapp proxy are set to 300s (5 minutes) because document processing with AI can be slow.

---

## 10. SSL Certificates (Let's Encrypt)

### DNS Setup

Before running Certbot, ensure your DNS A records are configured:

| Record Type | Name | Value |
|-------------|------|-------|
| A | `digitalizelabs.vn` | `<your-vps-ip>` |
| A | `www.digitalizelabs.vn` | `<your-vps-ip>` |
| A | `app.digitalizelabs.vn` | `<your-vps-ip>` |
| A | `admin.digitalizelabs.vn` | `<your-vps-ip>` |

> ⚠️ **CAUTION:** DNS propagation can take up to 48 hours. Verify with `dig app.digitalizelabs.vn` before running Certbot.

### Install and Run Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificates for all domains at once
sudo certbot --nginx \
  -d digitalizelabs.vn \
  -d www.digitalizelabs.vn \
  -d app.digitalizelabs.vn \
  -d admin.digitalizelabs.vn

# Follow the prompts:
# - Enter email for renewal notifications
# - Agree to terms of service
# - Choose to redirect HTTP to HTTPS (recommended)
```

Certbot will automatically:
1. Obtain SSL certificates from Let's Encrypt
2. Modify your Nginx config to add SSL blocks
3. Set up auto-renewal via systemd timer

### Verify Auto-Renewal

```bash
# Check the renewal timer is active
sudo systemctl status certbot.timer

# Test renewal (dry run)
sudo certbot renew --dry-run
```

> ⚠️ **CAUTION:** Let's Encrypt certificates expire every 90 days. The auto-renewal timer handles this, but verify it's running. If renewal fails (e.g., DNS misconfigured), your sites will show security warnings.

---

## 11. Maintenance & Operations

### Container Management

```bash
# View status of all containers
docker compose ps

# View real-time logs (all services)
docker compose logs -f

# View logs for a specific service
docker compose logs -f webapp
docker compose logs -f python-engine
docker compose logs -f postgres
docker compose logs -f admin
docker compose logs -f landingpage

# View last 100 lines of a service log
docker compose logs --tail=100 webapp

# Restart a specific container (no rebuild)
docker compose restart webapp
docker compose restart python-engine

# Rebuild and restart a specific service (after code changes)
docker compose up -d --build webapp

# Stop everything
docker compose down

# Stop everything AND delete volumes (⚠️ DELETES DATABASE!)
# docker compose down -v   # DANGER — only if you want to start fresh
```

> ⚠️ **CAUTION:** `docker compose down -v` will delete the PostgreSQL data volume. **All your data will be lost.** Only use this for a complete reset.

### Database Operations in Production

```bash
# Run database migration after schema changes
docker compose exec webapp pnpm run db:push
# OR for proper migrations:
docker compose exec webapp pnpm run db:migrate

# Seed admin accounts
docker compose exec webapp pnpm run db:seed

# Open Prisma Studio (access via SSH tunnel)
# On your VPS:
docker compose exec webapp pnpm run db:studio
# On your local machine (to access it):
ssh -L 5555:localhost:5555 user@your-vps-ip
# Then open http://localhost:5555 in your browser
```

### Database Backups

```bash
# Create a backup
docker compose exec postgres pg_dump -U dl_user digitalize_labs > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from a backup (⚠️ OVERWRITES CURRENT DATA)
cat backup_20260303_120000.sql | docker compose exec -T postgres psql -U dl_user digitalize_labs

# Automated daily backup (add to crontab)
# crontab -e
# 0 2 * * * cd /var/www/digitalize-labs && docker compose exec -T postgres pg_dump -U dl_user digitalize_labs | gzip > /var/backups/dl/backup_$(date +\%Y\%m\%d).sql.gz
```

> ⚠️ **CAUTION:** Always test your backups by restoring to a test database. An untested backup is not a backup.

### Deploying Updates

```bash
# Pull latest code
cd /var/www/digitalize-labs
git pull origin main

# Rebuild and restart changed services
docker compose up -d --build

# If there are database schema changes, run migrations AFTER the rebuild:
docker compose exec webapp pnpm run db:migrate

# Verify all services are healthy
docker compose ps
docker compose logs --tail=20
```

### Cron Cleanup Job

The webapp has a cron endpoint that deletes PDF files for documents verified more than 7 days ago:

```bash
# Trigger manually
curl -X POST http://localhost:3000/api/cron/cleanup \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Set up as a daily cron job (crontab -e)
0 3 * * * curl -s -X POST http://localhost:3000/api/cron/cleanup -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/dl-cleanup.log 2>&1
```

### Monitoring Disk Space

```bash
# Check Docker disk usage
docker system df

# Clean unused Docker resources (dangling images, stopped containers)
docker system prune -f

# Clean all unused images (⚠️ will force rebuild next time)
docker image prune -a -f

# Check upload directory size
du -sh /var/lib/docker/volumes/dl_uploads/_data/
```

---

## 12. Troubleshooting Guide

### Problem: Container crashes with "Killed" or OOM

**Cause:** Not enough RAM.  
**Fix:** Add swap space (see Prerequisites) or increase the VPS RAM.
```bash
# Check memory usage
free -h
docker stats --no-stream
```

### Problem: "ECONNREFUSED" when processing documents

**Cause:** The webapp can't reach the Python engine.  
**Check:**
```bash
# Is the python-engine container running?
docker compose ps python-engine

# Can you reach it from the webapp container?
docker compose exec webapp curl http://python-engine:8000/docs
```
**Fix:** Ensure `PYTHON_ENGINE_URL` is set to `http://python-engine:8000` (container name, not localhost).

### Problem: "EACCES: permission denied" on uploads directory

**Cause:** Docker volume permissions mismatch.  
**Fix:**
```bash
docker compose exec webapp mkdir -p /app/uploads/pdfs
docker compose exec webapp chmod -R 777 /app/uploads
```

### Problem: "relation does not exist" error

**Cause:** Database schema hasn't been pushed.  
**Fix:**
```bash
docker compose exec webapp pnpm run db:push
```

### Problem: Nginx returns "502 Bad Gateway"

**Cause:** The upstream container isn't running or hasn't finished starting.  
**Check:**
```bash
docker compose ps
docker compose logs webapp
```
**Fix:** Wait for the container to fully start. Check if the port binding is correct.

### Problem: Tesseract errors in Python engine

**Cause:** Tesseract OCR is not installed in the Docker image.  
**Check:**
```bash
docker compose exec python-engine tesseract --version
```
**Fix:** Ensure the Python engine Dockerfile installs `tesseract-ocr` and `tesseract-ocr-vie`.

### Problem: PNPM workspace errors during build

**Common errors:**
- `ERR_PNPM_NO_MATCHING_VERSION` — Check that all `workspace:*` references point to existing packages.
- `ENOWORKSPACES` — You're running npm instead of pnpm.
- `Cannot find module '@dl/database'` — Run `pnpm run db:generate` first.

### Problem: Next.js build hangs or runs out of memory

**Fix:** Increase Node.js memory limit:
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
docker compose build
```

---

## 13. Rollback Procedures

### Rolling Back Code Changes

```bash
# See recent deployments
git log --oneline -10

# Roll back to a specific commit
git checkout <commit-hash>

# Rebuild
docker compose up -d --build
```

### Rolling Back Database Migrations

> ⚠️ **CAUTION:** Database rollbacks can cause data loss. Always backup first.

```bash
# Backup current state
docker compose exec postgres pg_dump -U dl_user digitalize_labs > pre_rollback_backup.sql

# Prisma doesn't support automatic rollback. You must manually:
# 1. Write a "down" SQL migration
# 2. Execute it against the database:
cat rollback.sql | docker compose exec -T postgres psql -U dl_user digitalize_labs
```

### Emergency: Full System Reset

> ⚠️ **DANGER — This deletes ALL data. Last resort only.**

```bash
# Stop everything
docker compose down -v

# Remove all images
docker rmi $(docker images -q --filter "reference=dl-*")

# Rebuild from scratch
docker compose up -d --build

# Re-initialize database
docker compose exec webapp pnpm run db:push
docker compose exec webapp pnpm run db:seed
```

---

## 14. Security Checklist

Before going to production, verify every item:

- [ ] **Changed default admin passwords** in `prisma/seed.ts`
- [ ] **Set a strong `POSTGRES_PASSWORD`** (not `dl_password`)
- [ ] **Set a strong `CRON_SECRET`** (`openssl rand -hex 32`)
- [ ] **`GEMINI_API_KEY`** is not in any `NEXT_PUBLIC_*` variable
- [ ] **Firewall (UFW)** is enabled with only ports 22, 80, 443 open:
  ```bash
  sudo ufw default deny incoming
  sudo ufw default allow outgoing
  sudo ufw allow 22/tcp    # SSH
  sudo ufw allow 80/tcp    # HTTP
  sudo ufw allow 443/tcp   # HTTPS
  sudo ufw enable
  ```
- [ ] **PostgreSQL** is NOT exposed to the internet (port binds to `127.0.0.1`)
- [ ] **Python Engine** is NOT exposed to the internet (port binds to `127.0.0.1`)
- [ ] **SSL certificates** are installed and auto-renewal is working
- [ ] **Admin portal** has IP restriction enabled (optional but recommended)
- [ ] **`.env` file** permissions are restrictive: `chmod 600 .env`
- [ ] **SSH** uses key-based authentication (password auth disabled)
- [ ] **Automatic security updates** are enabled:
  ```bash
  sudo apt install unattended-upgrades
  sudo dpkg-reconfigure -plow unattended-upgrades
  ```
- [ ] **Database backups** are automated and tested
- [ ] **Docker images** are rebuilt regularly to get security patches

---

> **Questions?** Open an issue in the repository or contact the DevOps team.
