# AI_CONTEXT.md — Digitalize Labs Monorepo v0.1.3

> **Purpose:** This file is the authoritative "System Rules" document for any AI agent (GitHub Copilot, Cursor, Gemini, Claude, etc.) that operates on this codebase. Read this file in its entirety before making ANY changes.
>
> **Last Updated:** 2026-03-03

---

## Table of Contents

1. [System Directives & Non-Negotiable Rules](#1-system-directives--non-negotiable-rules)
2. [Project Identity](#2-project-identity)
3. [Monorepo Architecture](#3-monorepo-architecture)
4. [Detailed File Tree](#4-detailed-file-tree)
5. [Package & App Descriptions](#5-package--app-descriptions)
6. [Database Schema & Models](#6-database-schema--models)
7. [Full Data Flow Pipeline](#7-full-data-flow-pipeline)
8. [API Route Inventory](#8-api-route-inventory)
9. [State Management & Client Architecture](#9-state-management--client-architecture)
10. [Internationalization (i18n)](#10-internationalization-i18n)
11. [Authentication & Authorization](#11-authentication--authorization)
12. [Tech Stack — Exact Versions](#12-tech-stack--exact-versions)
13. [Environment Variables Reference](#13-environment-variables-reference)
14. [Known Gaps & Technical Debt](#14-known-gaps--technical-debt)
15. [Coding Conventions](#15-coding-conventions)

---

## 1. System Directives & Non-Negotiable Rules

These rules are **absolute**. Violation of any rule will lead to broken builds, data loss, or security incidents.

### 🔴 CRITICAL — Do NOT:

| # | Rule | Reason |
|---|------|--------|
| 1 | **NEVER** modify `packages/database/prisma/schema.prisma` without explicit human approval. | Schema changes require migration planning. A careless change can cause data loss or downtime. |
| 2 | **NEVER** run `prisma migrate reset` or `prisma db push --force-reset` on production. | This drops all tables and destroys all data irreversibly. |
| 3 | **NEVER** install dependencies inside an individual `apps/*/` or `packages/*/` directory using `npm install` or `yarn add`. | This monorepo uses PNPM workspaces. Use `pnpm add <pkg> --filter @dl/<workspace>` from the **root**. |
| 4 | **NEVER** commit `.env`, `.env.local`, or any file containing secrets. | The `.gitignore` already excludes them. Only `.env.example` should be committed. |
| 5 | **NEVER** hardcode URLs to other services (e.g., `http://127.0.0.1:8000`). | Use environment variables (`PYTHON_ENGINE_URL`). Hardcoded URLs break in Docker/production. |
| 6 | **NEVER** duplicate shared components. If a component exists in `@dl/ui`, use it. | Duplication leads to visual inconsistency and maintenance nightmares. |
| 7 | **NEVER** add `@prisma/client` as a direct dependency to `apps/*`. | All apps must import Prisma via `@dl/database`. This ensures a single generated client. |
| 8 | **NEVER** use `require()` in app code. Use ES module `import`. | The project uses TypeScript ES modules throughout. `require()` is only allowed in `next.config.js`. |

### 🟢 ALWAYS:

| # | Rule |
|---|------|
| 1 | Run `pnpm install` from the monorepo root after adding any dependency. |
| 2 | Run `pnpm run db:generate` after any schema change to regenerate the Prisma client. |
| 3 | Test your changes with `pnpm run build` before declaring them done. |
| 4 | Use `"use client"` directive at the top of any React component that uses hooks, event handlers, or browser APIs. |
| 5 | Use the `sonner` toast library (already installed) for user-facing notifications. |
| 6 | Use `@dl/ui` components (`Button`, `ErrorBoundary`, `PageTransition`) for consistency. |
| 7 | When adding API routes, follow the existing pattern in `apps/webapp/app/api/` or `apps/admin/app/api/`. |

---

## 2. Project Identity

| Field | Value |
|-------|-------|
| **Name** | Digitalize Labs |
| **Version** | 0.1.3 |
| **Domain** | `digitalizelabs.vn` |
| **Description** | A document digitization platform with OCR, NLP entity extraction, full-text search, and a 3D knowledge graph. |
| **Language** | Vietnamese-first (with English i18n support) |
| **Package Manager** | pnpm@9.0.0 |
| **Monorepo Tool** | Turborepo v2.4.0 |

---

## 3. Monorepo Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Turborepo Root                    │
│         (turbo.json + pnpm-workspace.yaml)          │
├────────────────────┬────────────────────────────────┤
│       APPS         │          PACKAGES              │
├────────────────────┼────────────────────────────────┤
│ apps/webapp        │ packages/database              │
│   @dl/webapp       │   @dl/database                 │
│   Port: 3000       │   Prisma Client + Schema       │
│                    │                                │
│ apps/landingpage   │ packages/ui                    │
│   @dl/landingpage  │   @dl/ui                       │
│   Port: 3001       │   Shared React Components      │
│                    │                                │
│ apps/admin         │                                │
│   @dl/admin        │                                │
│   Port: 3002       │                                │
│                    │                                │
│ apps/python-engine │                                │
│   FastAPI          │                                │
│   Port: 8000       │                                │
└────────────────────┴────────────────────────────────┘
```

**Dependency Graph:**
```
webapp ──────► @dl/database ──► @prisma/client ──► PostgreSQL
  │               ▲
  ├──► @dl/ui     │
  │               │
admin ────────────┤
  │               │
  ├──► @dl/ui     │
  │               │
landingpage ──────┘

webapp ──HTTP──► python-engine (FastAPI, port 8000)
```

### Workspace Configuration

**`pnpm-workspace.yaml`:**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

> ⚠️ **CAUTION:** `apps/python-engine` is listed in the workspace glob but is NOT a Node.js package. PNPM will silently ignore it because it has no `package.json`. This is intentional.

---

## 4. Detailed File Tree

```
dl/                                 # Monorepo root
├── .env                            # Root env (DATABASE_URL, GEMINI_API_KEY, etc.)
├── .env.local                      # Local overrides (CRON_SECRET, etc.)
├── .dockerignore                   # Docker build exclusions
├── .gitignore                      # Git exclusions
├── Dockerfile                      # ⚠️ LEGACY — single-app Dockerfile, needs rewrite
├── docker-compose.yml              # ⚠️ LEGACY — only postgres + 1 nextjs-app
├── package.json                    # Root scripts (turbo dev/build/lint, db:*)
├── pnpm-lock.yaml                  # Lockfile
├── pnpm-workspace.yaml             # Workspace definition
├── turbo.json                      # Turborepo task pipeline config
│
├── apps/
│   ├── webapp/                     # Main document processing app (@dl/webapp)
│   │   ├── app/
│   │   │   ├── api/                # Next.js API routes
│   │   │   │   ├── cron/           #   └── cleanup (verified PDF cleanup cron)
│   │   │   │   ├── documents/      #   └── CRUD + [id]/ + [id]/extract
│   │   │   │   ├── graph/          #   └── summary (knowledge graph data)
│   │   │   │   ├── pages/          #   └── [pageId]/assets + corrections
│   │   │   │   ├── processing/     #   └── status
│   │   │   │   ├── search/         #   └── FTS search endpoint
│   │   │   │   └── upload/         #   └── file upload handler
│   │   │   ├── dashboard/          # Dashboard page
│   │   │   ├── doc/                # Document viewer page
│   │   │   ├── graph/              # 3D Knowledge Graph page
│   │   │   ├── processing/         # Processing status page
│   │   │   ├── search/             # Search results page
│   │   │   ├── globals.css         # Tailwind base styles
│   │   │   ├── layout.tsx          # Root layout (providers, sidebar)
│   │   │   ├── page.tsx            # Homepage / Document list
│   │   │   ├── providers.tsx       # React Query + global providers
│   │   │   └── shell.tsx           # App shell (sidebar + main content)
│   │   ├── components/
│   │   │   ├── editor/             # Token editing components (3 files)
│   │   │   ├── graph/              # Knowledge graph visualization (2 files)
│   │   │   ├── ui/                 # App-specific UI components (3 files)
│   │   │   └── viewer/             # Document page viewer (1 file)
│   │   ├── lib/
│   │   │   ├── api.ts              # Client-side API helper (fetchClient wrapper)
│   │   │   ├── cleanupVerifiedPdfs.ts  # Cron job: delete PDFs after 7 days
│   │   │   ├── gemini.ts           # Google Gemini AI configuration
│   │   │   ├── prisma.ts           # ⚠️ LOCAL prisma instance (should use @dl/database)
│   │   │   ├── processDocument.ts  # Orchestrator: calls python-engine, saves to DB
│   │   │   ├── processDocumentAI.ts # Gemini AI extraction (image → XML)
│   │   │   ├── router-shim.tsx     # Router compatibility shim
│   │   │   └── store.ts            # Zustand global store
│   │   ├── messages/
│   │   │   ├── en.json             # English translations
│   │   │   └── vi.json             # Vietnamese translations
│   │   ├── types.ts                # TypeScript interfaces (Document, Page, Token, etc.)
│   │   ├── constants.ts            # Runtime constants (API_BASE_URL, MAX_GRAPH_NODES)
│   │   ├── i18n.ts                 # next-intl configuration (cookie-based locale)
│   │   ├── next.config.js          # Next.js config (standalone output, next-intl)
│   │   ├── tailwind.config.ts      # Tailwind CSS configuration
│   │   ├── vitest.config.ts        # Vitest test runner config
│   │   ├── package.json            # Dependencies
│   │   ├── uploads/                # ⚠️ Runtime directory for uploaded PDFs
│   │   └── public/mock/            # Rendered page images (JPGs from python-engine)
│   │
│   ├── landingpage/                # Marketing site (@dl/landingpage)
│   │   ├── app/
│   │   │   ├── api/                # API routes (e.g., trial registration)
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx            # Full landing page (42KB, single-file)
│   │   ├── assets/                 # Static assets
│   │   ├── messages/               # i18n translations (en.json, vi.json)
│   │   ├── i18n.ts
│   │   ├── next.config.js
│   │   └── package.json
│   │
│   ├── admin/                      # Admin dashboard (@dl/admin)
│   │   ├── app/
│   │   │   ├── (admin)/            # Route group (requires auth)
│   │   │   │   ├── dashboard/      # Admin dashboard overview
│   │   │   │   ├── documents/      # Document management
│   │   │   │   ├── trial-users/    # Lead/trial user management
│   │   │   │   ├── audit-logs/     # Audit log viewer
│   │   │   │   └── layout.tsx      # Admin shell layout (sidebar, header)
│   │   │   ├── api/
│   │   │   │   ├── auth/           # Login/logout/session validation
│   │   │   │   ├── dashboard/      # Dashboard stats endpoint
│   │   │   │   ├── documents/      # Document CRUD for admin
│   │   │   │   ├── trial-users/    # Lead management endpoints
│   │   │   │   └── audit-logs/     # Audit log query endpoint
│   │   │   ├── login/              # Login page
│   │   │   └── page.tsx            # Root redirect
│   │   ├── middleware.ts           # Auth middleware (session cookie check)
│   │   ├── messages/               # i18n translations
│   │   ├── i18n.ts
│   │   ├── next.config.js
│   │   └── package.json
│   │
│   └── python-engine/              # OCR/NLP extraction service
│       ├── main.py                 # FastAPI app (339 lines)
│       ├── requirements.txt        # Python dependencies
│       └── venv/                   # Local virtual environment (gitignored)
│
├── packages/
│   ├── database/                   # Shared Prisma package (@dl/database)
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # ⚠️ THE SOURCE OF TRUTH for all DB models
│   │   │   ├── seed.ts             # Admin account seeder
│   │   │   └── migrations/         # Prisma migration history
│   │   ├── src/
│   │   │   └── index.ts            # Exports PrismaClient singleton + all types
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ui/                         # Shared UI library (@dl/ui)
│       ├── src/
│       │   ├── index.ts            # Barrel export
│       │   ├── Button.tsx          # Shared Button component
│       │   ├── ErrorBoundary.tsx   # React Error Boundary
│       │   └── PageTransition.tsx  # Framer Motion page transition wrapper
│       ├── package.json
│       └── tsconfig.json
```

---

## 5. Package & App Descriptions

### `@dl/webapp` (apps/webapp) — Port 3000
The primary end-user application. Users upload documents (PDF/images), which are processed by the Python engine. Users can then:
- View processed document pages with OCR overlays
- Edit/verify individual tokens
- Search across all documents using PostgreSQL Full-Text Search
- Explore a 3D knowledge graph of extracted entities
- Trigger Gemini AI extraction for structured XML output

**Key Files:**
- `lib/processDocument.ts` — Orchestration layer that calls the Python engine and stores results
- `lib/processDocumentAI.ts` — Gemini AI post-processing (images → structured XML)
- `lib/store.ts` — Zustand store (sidebar, theme, locale, viewer state)
- `lib/api.ts` — Client-side API wrapper used by React Query

### `@dl/landingpage` (apps/landingpage) — Port 3001
Marketing website for lead generation. Contains a trial registration form that writes to the `TrialLead` table.

### `@dl/admin` (apps/admin) — Port 3002
Protected admin dashboard. Features:
- Document lifecycle management (status changes, soft delete)
- Trial lead management
- Audit log viewer
- Dashboard with traffic/document statistics

**Authentication:** Cookie-based sessions. The middleware (`middleware.ts`) checks for a `dl_admin_session` cookie on every request except `/login`, `/api/auth/*`, and static assets.

### `apps/python-engine` — Port 8000
A standalone FastAPI service that handles the heavy compute:
- **PDF Processing:** Uses PyMuPDF (`fitz`) to render pages to images and extract native text with bounding boxes
- **OCR Fallback:** Uses Tesseract (via `pytesseract`) when PyMuPDF finds < 5 tokens on a page (scanned documents)
- **NER:** Uses `underthesea` library for Vietnamese Named Entity Recognition (PER, ORG, LOC)
- **Keyword Extraction:** Uses `yake` for language-agnostic keyword extraction
- Returns structured JSON with pages, tokens, lines, bounding boxes, and graph nodes/edges

### `@dl/database` (packages/database)
Shared Prisma client package. All apps import from here:
```ts
import { prisma } from "@dl/database";
// or
import prisma, { Document, Page } from "@dl/database";
```

### `@dl/ui` (packages/ui)
Shared React component library. Currently exports:
- `Button` — Styled button with variants
- `ErrorBoundary` — React error boundary with fallback UI
- `PageTransition` — Framer Motion page transition wrapper

---

## 6. Database Schema & Models

**Database:** PostgreSQL 16 (Alpine)  
**ORM:** Prisma 5.22.0  
**Preview Features:** `fullTextSearch`

### Models Summary

| Model | Description | Key Fields |
|-------|-------------|------------|
| `Document` | Core entity — a digitized document | `id`, `title`, `status`, `phase`, `pageCount`, `ocrText`, `searchVector` (tsvector), `xmlData`, `filePath`, `deletedAt` |
| `Page` | Individual page of a document | `id`, `documentId`, `pageNo`, `imageUrl`, `width`, `height`, `needsReview`, `assets` (JSON string of lines & tokens) |
| `TrialLead` | Landing page lead registration | `name`, `email`, `phone`, `company`, `interest`, `status` |
| `AdminUser` | Admin portal user accounts | `email`, `hashedPassword`, `name`, `role` (superadmin/admin/viewer) |
| `AdminSession` | Admin session tokens | `userId`, `token`, `expiresAt`, `ipAddress`, `userAgent` |
| `AuditLog` | All admin actions are logged here | `action`, `entity`, `entityId`, `details` (JSON), `userId`, `documentId` |
| `PageVisit` | Simple page view tracking | `app`, `path`, `ipAddress`, `userAgent`, `referrer` |
| `GraphNode` | Knowledge graph entity | `label`, `type` (KEYWORD, ORG, PER, LOC) — unique on `[label, type]` |
| `GraphEdge` | Links a GraphNode to a Document | `nodeId`, `documentId`, `weight` — unique on `[nodeId, documentId]` |

### Document Status Lifecycle
```
pending → ingest → processing → ready → verified → error (at any step)
                                                  ↘ archived (via phase)
```

### Document Phase Lifecycle
```
draft → review → approved → archived
```

### Full-Text Search (FTS)
- The `Document.searchVector` field is of type `Unsupported("tsvector")`.
- It is populated via **raw SQL** (not Prisma's ORM layer).
- The `ocrText` field stores the plain-text OCR output for FTS indexing.
- Search queries use `plainto_tsquery('simple', $query)` or Vietnamese dictionary if configured.

> ⚠️ **CAUTION:** Prisma cannot read/write `tsvector` fields directly. You MUST use `prisma.$queryRaw` or `prisma.$executeRaw` for any FTS operations. Never try to include `searchVector` in a standard Prisma `select` or `create`.

### Knowledge Graph
- `GraphNode` stores unique entities (a person name, organization, location, or keyword).
- `GraphEdge` connects a `GraphNode` to a `Document` with a `weight` score.
- The frontend renders this as a 3D force-directed graph using `@react-three/fiber` and a 2D view with `cytoscape`.

---

## 7. Full Data Flow Pipeline

```
┌──────────────────────────────────────────────────────────────────┐
│                    DOCUMENT PROCESSING PIPELINE                  │
└──────────────────────────────────────────────────────────────────┘

Step 1: UPLOAD
  User → webapp UI → POST /api/upload
  └─► File saved to: apps/webapp/uploads/pdfs/<uuid>.pdf
  └─► Document row created in DB: status = "pending"

Step 2: PROCESSING TRIGGER
  webapp backend → processDocumentInBackground(docId, filePath)
  └─► POST http://<PYTHON_ENGINE_URL>/process
      Body: { docId, filePath, outRoot: "public/mock" }

Step 3: PYTHON ENGINE EXTRACTION
  python-engine receives the request:
  ├── PDF? → PyMuPDF renders each page to JPG (2x zoom)
  │   ├── Native text found? → extract_with_pymupdf() returns lines + tokens with bboxes
  │   └── < 5 tokens? → FALLBACK to extract_with_tesseract()
  ├── Image? → extract_with_tesseract() directly
  │
  ├── NLP PHASE:
  │   ├── Underthesea NER → extracts PER, ORG, LOC entities
  │   └── YAKE keywords → extracts top 10 Vietnamese keywords
  │   └── Deduplication + scoring → returns top 15 graph nodes
  │
  └── Response JSON:
      {
        pages: [{ id, pageNo, imageUrl, width, height }],
        pageAssetsById: { "<pageId>": { lines: [...], tokens: [...] } },
        graph: { nodes: [...], edges: [...] }
      }

Step 4: STORAGE (back in webapp)
  processDocumentInBackground() receives the response:
  ├── Creates Page rows in DB (with assets JSON)
  ├── Accumulates ocrText for FTS indexing
  ├── Updates Document: status = "ready", pageCount, ocrText
  │
  └── If autoAI=true:
      ├── Sets status = "processing"
      └── Chains processWithGemini(docId)

Step 5: AI EXTRACTION (Optional — Gemini)
  processWithGemini(docId):
  ├── Reads each page image from public/mock/<docId>/page-N.jpg
  ├── Sends image to Gemini 2.0 Flash with extraction prompt
  ├── Receives structured XML per page
  ├── Concatenates into full <Document><Page>...</Page></Document>
  └── Updates Document: xmlData = fullXml, status = "verified"

Step 6: USER ACCESS
  ├── Dashboard → lists all documents with status badges
  ├── Document Viewer → renders page images with OCR overlays (tokens/lines)
  ├── Search → POST /api/search → PostgreSQL FTS on ocrText/searchVector
  ├── Knowledge Graph → GET /api/graph/summary → 3D visualization
  └── Editor → user can correct individual tokens → POST /api/pages/<id>/corrections

Step 7: MAINTENANCE (Cron)
  POST /api/cron/cleanup (with Bearer token)
  └─► cleanupVerifiedPdfs(): deletes PDF files for documents verified > 7 days ago
```

---

## 8. API Route Inventory

### Webapp API Routes (`apps/webapp/app/api/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List all documents |
| GET | `/api/documents/[id]` | Get document detail + pages |
| POST | `/api/documents/[id]/extract` | Trigger Gemini AI extraction |
| POST | `/api/upload` | Upload a PDF/image file |
| GET | `/api/pages/[pageId]/assets` | Get page image, lines, tokens |
| POST | `/api/pages/[pageId]/corrections` | Submit token corrections |
| GET | `/api/search?q=<query>` | Full-text search across documents |
| GET | `/api/graph/summary?limitNodes=<n>` | Get knowledge graph nodes/edges |
| GET | `/api/processing/status` | Get current processing queue status |
| POST | `/api/cron/cleanup` | Trigger verified PDF cleanup (auth required) |

### Admin API Routes (`apps/admin/app/api/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth` | Login (email + password → session cookie) |
| - | `/api/auth/logout` | Logout (clear session) |
| - | `/api/auth/me` | Get current admin user |
| GET | `/api/dashboard` | Dashboard statistics |
| GET/PATCH/DELETE | `/api/documents` | Document management |
| GET/PATCH | `/api/trial-users` | Trial lead management |
| GET | `/api/audit-logs` | Query audit logs |

### Python Engine Endpoint (`apps/python-engine`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/process` | Process a document (OCR + NLP). Body: `{ docId, filePath, outRoot }` |

---

## 9. State Management & Client Architecture

### Zustand Store (`apps/webapp/lib/store.ts`)

The webapp uses Zustand with localStorage persistence:

| State | Type | Description |
|-------|------|-------------|
| `sidebarOpen` | `boolean` | Sidebar toggle state |
| `theme` | `"light" \| "dark"` | Theme mode |
| `locale` | `"vi" \| "en"` | UI language |
| `viewMode` | `"ocr" \| "verified" \| "xml"` | Document viewer display mode |
| `selectedTokenId` | `string \| null` | Currently selected token for editing |
| `multiSelectedTokenIds` | `string[]` | Batch-selected tokens |

**Persisted to localStorage:** `sidebarOpen`, `theme`, `viewMode`, `locale` (key: `"digitalize-labs-store"`)

### React Query
All client-side data fetching uses `@tanstack/react-query` via the `api.ts` helper. The `QueryClientProvider` wraps the app in `providers.tsx`.

---

## 10. Internationalization (i18n)

- **Library:** `next-intl` v4.8.3
- **Strategy:** Cookie-based (no URL sub-paths like `/en` or `/vi`)
- **Default locale:** Vietnamese (`vi`)
- **Cookie name:** `NEXT_LOCALE`
- **Message files:** `messages/vi.json` and `messages/en.json` in each app
- **Config:** `i18n.ts` in each app root reads the cookie and loads messages

> ⚠️ **CAUTION:** All three apps (webapp, admin, landingpage) have **independent** i18n configurations and message files. They do NOT share translations. If you add a translation key to the webapp, you must separately add it to admin/landingpage if needed.

---

## 11. Authentication & Authorization

### Admin Authentication Flow
1. User visits `/login` on the admin app
2. Submits email + password → `POST /api/auth`
3. Server validates credentials against `AdminUser` table (SHA-256 + salt hash)
4. On success: creates `AdminSession` row, sets `dl_admin_session` cookie
5. Middleware (`middleware.ts`) checks the cookie on every request
6. Missing cookie → redirects to `/login?redirect=<path>`

### Admin Roles
| Role | Capabilities |
|------|-------------|
| `superadmin` | Full access: manage users, delete documents permanently |
| `admin` | Document management, lead management, view audit logs |
| `viewer` | Read-only access to dashboard and documents |

### Default Seed Accounts
> ⚠️ **SECURITY WARNING:** Change these passwords immediately in production!

| Email | Password | Role |
|-------|----------|------|
| `admin@digitalizelabs.vn` | `Admin@2026!` | superadmin |
| `manager@digitalizelabs.vn` | `Manager@2026!` | admin |
| `reviewer@digitalizelabs.vn` | `Reviewer@2026!` | admin |

---

## 12. Tech Stack — Exact Versions

### Node.js Ecosystem
| Package | Version | Location |
|---------|---------|----------|
| Node.js | 20.x | Runtime |
| pnpm | 9.0.0 | Package manager |
| turbo | ^2.4.0 | Monorepo orchestrator |
| next | 14.2.0 | All 3 apps |
| react | ^18 | All 3 apps |
| react-dom | ^18 | All 3 apps |
| typescript | ^5 | All packages |
| @prisma/client | ^5.22.0 | packages/database |
| prisma (CLI) | ^5.22.0 | packages/database (dev) |

### Webapp-Specific
| Package | Version | Purpose |
|---------|---------|---------|
| zustand | ^4.5.2 | Client state management |
| @tanstack/react-query | ^5.29.0 | Server state / data fetching |
| framer-motion | ^12.34.3 | Animations |
| lucide-react | ^0.370.0 | Icon library |
| next-intl | ^4.8.3 | Internationalization |
| three | ^0.163.0 | 3D rendering (Knowledge Graph) |
| @react-three/fiber | ^8.16.0 | React Three.js bindings |
| @react-three/drei | ^9.105.0 | Three.js helpers |
| cytoscape | ^3.28.0 | 2D graph rendering |
| react-cytoscapejs | ^2.0.0 | Cytoscape React wrapper |
| sonner | ^2.0.7 | Toast notifications |
| tailwindcss | ^3 | Utility-first CSS |
| clsx + tailwind-merge | — | Conditional class names |
| @google/generative-ai | ^0.24.1 | Gemini AI SDK |
| vitest | ^4.0.18 | Test runner |

### Python Engine
| Package | Purpose |
|---------|---------|
| fastapi | HTTP API framework |
| uvicorn | ASGI server |
| pymupdf (fitz) | PDF rendering + native text extraction |
| pytesseract | Tesseract OCR wrapper |
| Pillow | Image processing |
| python-multipart | FastAPI file upload support |
| yake | Keyword extraction |
| underthesea | Vietnamese NLP (NER, word segmentation) |

### Infrastructure
| Tool | Version/Config |
|------|---------------|
| PostgreSQL | 16-alpine (Docker) |
| Docker | Required for production |
| Nginx | Reverse proxy for subdomains |

---

## 13. Environment Variables Reference

All environment variables are defined in the root `.env` file. Each app also has a symlinked or copied `.env`.

| Variable | Required | Example | Used By | Description |
|----------|----------|---------|---------|-------------|
| `DATABASE_URL` | ✅ | `postgresql://dl_user:dl_password@localhost:5432/digitalize_labs` | All apps + packages/database | PostgreSQL connection string. Use `localhost` for local dev, `postgres` (container name) for Docker. |
| `GEMINI_API_KEY` | ⚠️ Optional | `AIza...` | webapp | Google Gemini API key for AI extraction. Only needed if using the AI extraction feature. |
| `NEXT_PUBLIC_USE_MOCK` | ⚠️ Optional | `false` | webapp | If `true`, uses mock data instead of real DB. Keep `false` in production. |
| `NEXT_PUBLIC_API_BASE_URL` | ⚠️ Optional | `http://localhost:3000` | webapp | Base URL for client-side API calls. Leave empty for same-origin requests in production. |
| `NEXT_PUBLIC_DEFAULT_MAX_GRAPH_NODES` | ⚠️ Optional | `500` | webapp | Maximum nodes in the knowledge graph visualization. |
| `CRON_SECRET` | ⚠️ Optional | `super_secret_cron_token` | webapp | Bearer token for the `/api/cron/cleanup` endpoint. |
| `PYTHON_ENGINE_URL` | ✅ | `http://127.0.0.1:8000` | webapp | URL of the Python FastAPI engine. Use `http://python-engine:8000` in Docker. |

> ⚠️ **CAUTION:** The current codebase has `PYTHON_ENGINE_URL` as a concept but `processDocument.ts` **hardcodes** `http://127.0.0.1:8000/process`. This must be refactored to use the env var before Docker deployment.

---

## 14. Known Gaps & Technical Debt

These are issues discovered during codebase audit that should be resolved:

| # | Issue | Severity | File(s) |
|---|-------|----------|---------|
| 1 | **Hardcoded Python URL** — `processDocument.ts` uses `http://127.0.0.1:8000` instead of `PYTHON_ENGINE_URL` env var. Will break in Docker. | 🔴 Critical | `apps/webapp/lib/processDocument.ts:18` |
| 2 | **Legacy Dockerfile** — The root `Dockerfile` is a single-app build. It doesn't support the monorepo's multi-app architecture. | 🔴 Critical | `Dockerfile` |
| 3 | **Incomplete docker-compose.yml** — Only defines `postgres` and one `nextjs-app`. Missing: `admin`, `landingpage`, `python-engine` services. | 🔴 Critical | `docker-compose.yml` |
| 4 | **Missing Tesseract in Docker** — The Dockerfile installs `pymupdf` but NOT `tesseract-ocr`. Tesseract-dependent processing will fail. | 🔴 Critical | `Dockerfile:43` |
| 5 | **Duplicate Prisma import** — `apps/webapp/lib/prisma.ts` creates its own PrismaClient instead of importing from `@dl/database`. | 🟡 Medium | `apps/webapp/lib/prisma.ts` |
| 6 | **No health checks** — No `/health` endpoints on any service. Docker/Nginx can't verify service readiness. | 🟡 Medium | All apps |
| 7 | **No rate limiting** — Public API endpoints have no rate limiting. | 🟡 Medium | All API routes |
| 8 | **Token field mismatch** — `processDocument.ts:52` references `t.text` but Python returns `t.textOcr`. | 🟡 Medium | `apps/webapp/lib/processDocument.ts:52` |
| 9 | **No Python Dockerfile** — `apps/python-engine` has no Dockerfile. | 🟡 Medium | `apps/python-engine/` |
| 10 | **.env files duplicated** — Each app has its own `.env` file that's a copy of the root. This can lead to drift. | 🟠 Low | All apps |

---

## 15. Coding Conventions

### TypeScript
- Strict mode is NOT enforced (`ignoreBuildErrors: true` in all next.config.js). This is technical debt.
- Use `interface` for object shapes, `type` for unions/intersections.
- All types for the webapp are in `apps/webapp/types.ts`.

### React
- **Server Components** are the default in Next.js 14 App Router.
- Add `"use client"` only when the component needs hooks, event handlers, or browser APIs.
- Use `@dl/ui` components for cross-app consistency.

### CSS
- Tailwind CSS v3 with custom theme extensions.
- Each app has its own `tailwind.config.ts` — they are NOT shared.
- Use `clsx()` + `tailwind-merge` (via `cn()` utility if available) for conditional classes.

### API Routes
- All API routes use Next.js App Router route handlers (`route.ts`).
- Return JSON with consistent shape: `{ data: ... }` or `{ error: "message" }`.
- Always wrap in try/catch and return appropriate HTTP status codes.

### Database
- ALWAYS import from `@dl/database`, never from `@prisma/client` directly.
- Use `prisma.$queryRaw` for FTS queries.
- Use transactions (`prisma.$transaction()`) for multi-step mutations.

### Git
- Never commit: `.env`, `node_modules/`, `.next/`, `venv/`, `__pycache__/`, `*.tsbuildinfo`
- Only `.env.example` should be committed.
