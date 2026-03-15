# Simon API Hub · api.abler.tirol

Production-grade NX monorepo — NestJS backend + Angular frontend.

Deployed at **https://api.abler.tirol** (formerly `hub.abler.tirol` — both domains are active and point to the same service).

Built by a Cyber Security Engineer from Tyrol focused on industrial high-availability systems, reverse engineering and secure API platforms.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | NestJS · TypeORM · SQLite / PostgreSQL |
| Frontend | Angular 19 (standalone) · Bootstrap 5 |
| Monorepo | NX · TypeScript |
| Barcode engine | `bwip-js` |
| API docs | Swagger UI at `/api` |
| Rate limiting | `@nestjs/throttler` |
| Font server | Self-hosted via `/fonts/*` — serves `DM Serif Display`, `Inter`, `DM Mono` as woff2 |

---

## Quick Start

```bash
# Backend (http://localhost:3000)
npx nx serve server

# Frontend (http://localhost:4200)
npx nx serve simonapi

# Run all backend tests
npx nx test server --no-coverage
```

---

## API Modules

### Barcode — `/api/barcode`

Standard and GS1-compliant barcodes as PNG or SVG.

#### Standard Barcodes

```bash
# Code128 PNG
curl "https://api.abler.tirol/api/barcode/png?type=code128&text=Hello123&includetext=true" -o out.png

# EAN-13 SVG
curl "https://api.abler.tirol/api/barcode/svg?type=ean13&text=5901234123457&includetext=true" -o out.svg
```

**Query params:** `type` · `text` · `includetext` · `scale` · `height`

Supported types: `code128` · `ean13` · `ean8` · `upca` · `code39` · `itf14` · `pdf417` · `datamatrix`

#### GS1 Barcodes — `POST /api/barcode/gs1/render`

Full AI validation, Mod-10 check digit computation, structured error responses.

```bash
curl -X POST https://hub.abler.tirol/api/barcode/gs1/render \
  -H "Content-Type: application/json" \
  -d '{
    "symbology": "gs1-128",
    "format": "png",
    "includetext": true,
    "scale": 3,
    "items": [
      { "ai": "01", "value": "0950600013437" },
      { "ai": "17", "value": "251231" },
      { "ai": "10", "value": "BATCH42" }
    ]
  }' -o gs1-128.png
```

**Symbologies:** `gs1-128` · `gs1datamatrix`  
**Format:** `png` · `svg`

#### GS1 Batch — `POST /api/barcode/gs1/batch` *(Pro)*

Up to 100 barcodes per request. Returns Base64-PNG or raw SVG per item. Partial failures are reported per-item rather than aborting the entire batch.

```bash
curl -X POST https://hub.abler.tirol/api/barcode/gs1/batch \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk_pro_..." \
  -d '{
    "symbology": "gs1-128",
    "format": "png",
    "barcodes": [
      { "ref": "p1", "items": [{ "ai": "01", "value": "09506000134376" }, { "ai": "17", "value": "261231" }] },
      { "ref": "p2", "items": [{ "ai": "01", "value": "09506000134376" }, { "ai": "10", "value": "LOT-B" }] }
    ]
  }'
```

#### GS1 Digital Link — `POST /api/barcode/gs1/digital-link/encode|decode` *(Pro)*

Convert AI items ↔ GS1 Digital Link URL (e.g. `https://id.example.com/01/09506000134376/17/251231`).

```bash
# Encode
curl -X POST https://hub.abler.tirol/api/barcode/gs1/digital-link/encode \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "https://id.example.com",
    "items": [{ "ai": "01", "value": "09506000134376" }, { "ai": "17", "value": "251231" }]
  }'

# Decode
curl -X POST https://hub.abler.tirol/api/barcode/gs1/digital-link/decode \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://id.example.com/01/09506000134376/17/251231" }'
```

#### GS1 AI Registry — `GET /api/barcode/gs1/registry`

Full GS1 Application Identifier registry (536 AIs) with patterns, labels, combination constraints and hints. Response is HTTP-cached for 24 h.

#### SSCC Generator — `/api/barcode/sscc/*` *(Pro)*

Serial Shipping Container Code (AI `00`) — builds, validates and renders GS1-128 barcodes. GS1 Company Prefix is validated against the official Member Organisation range table (100+ entries).

| Endpoint | Description |
|---|---|
| `POST /api/barcode/sscc/build` | Assemble SSCC from components, compute Mod-10 check digit, render barcode |
| `POST /api/barcode/sscc/auto` | Auto-increment: atomically allocate next serial from DB counter, render |
| `POST /api/barcode/sscc/validate` | Verify Mod-10 check digit of an existing 18-digit SSCC |
| `POST /api/barcode/sscc/render` | Render a pre-built 18-digit SSCC as GS1-128 |
| `GET /api/barcode/sscc/prefix-info?prefix=` | Look up GS1 Member Organisation for a company prefix |
| `GET /api/barcode/sscc/counter?extensionDigit=&companyPrefix=` | Inspect current auto-increment counter state |

```bash
# Build SSCC from components
curl -X POST https://hub.abler.tirol/api/barcode/sscc/build \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk_pro_..." \
  -d '{
    "extensionDigit": 3,
    "companyPrefix": "0350000",
    "serialReference": "1",
    "format": "png"
  }' -o sscc.png
# Response headers: x-sscc, x-sscc-check-digit, x-sscc-member-org

# Auto-increment (allocates next serial from DB)
curl -X POST https://hub.abler.tirol/api/barcode/sscc/auto \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk_pro_..." \
  -d '{ "extensionDigit": 3, "companyPrefix": "0350000" }' -o sscc.png

# Validate
curl -X POST https://hub.abler.tirol/api/barcode/sscc/validate \
  -H "Content-Type: application/json" \
  -d '{ "sscc": "330350000000000014" }'
# → { "valid": true, "checkDigit": 4, "expected": 4 }
```

**SSCC structure:**
```
[ Extension (1) ][ GS1 Company Prefix (7–10) ][ Serial Reference ][ Check Digit (1) ]
                                                = 18 digits total
```

---

### QR — `POST /api/qr`

```bash
curl -X POST https://hub.abler.tirol/api/qr \
  -H "Content-Type: application/json" \
  -d '{
    "type": "url",
    "payload": { "url": "https://example.com" },
    "format": "svg",
    "size": 512,
    "ecc": "M"
  }'
```

**Types:** `url` · `text` · `email` · `phone` · `sms` · `vcard` · `wifi`  
**Format:** `svg` (default) · `png`  
**Options:** `size` · `margin` · `ecc` (L/M/Q/H)  
**Download:** append `?download=1` to force `Content-Disposition: attachment`

---

### Watermark — `POST /api/watermark/apply`

Multipart form upload. Accepts JPEG, PNG, WebP, AVIF — returns same format.

```bash
# Text watermark
curl -X POST https://hub.abler.tirol/api/watermark/apply \
  -F "file=@photo.jpg" \
  -F "mode=text" \
  -F "text=© 2025" \
  -F "position=bottom-right" \
  -F "opacity=0.5" \
  -o out.jpg

# Logo watermark
curl -X POST https://hub.abler.tirol/api/watermark/apply \
  -F "file=@photo.jpg" \
  -F "logo=@logo.png" \
  -F "mode=logo" \
  -F "scale=0.2" \
  -F "opacity=0.5" \
  -o out.jpg

# Tiled text pattern
curl -X POST https://hub.abler.tirol/api/watermark/apply \
  -F "file=@photo.png" \
  -F "mode=text" \
  -F "text=CONFIDENTIAL" \
  -F "tile=true" \
  -F "gap=160" \
  -F "rotate=-30" \
  -F "opacity=0.2" \
  -o out.png
```

**Positions:** `center` · `top-left` · `top-right` · `bottom-left` · `bottom-right` · `top-center` · `bottom-center` · `center-left` · `center-right`

---

### Locks — `/api/locks`

Swipe-to-open access link management.

| Endpoint | Description |
|---|---|
| `POST /api/locks` | Create lock |
| `PATCH /api/locks/:id` | Update lock |
| `GET /api/locks` | List locks (admin) |
| `GET /api/locks/:id` | Get lock (admin) |
| `POST /api/locks/open` | Open with swipe token |
| `GET /api/locks/locks` | Public lock listing |

---

### Signpack — `/api/signpacks`

Upload → sign → bundle workflow for document signing.

```bash
# Upload
curl -X POST https://hub.abler.tirol/api/signpacks \
  -F "file=@document.pdf" -F "expiresInMinutes=60"
# → { id, token, ... }

# Get metadata
curl "https://hub.abler.tirol/api/signpacks/<ID>/meta?token=<TOKEN>"

# Upload signed file
curl -X POST "https://hub.abler.tirol/api/signpacks/<ID>/sign?token=<TOKEN>" \
  -F "file=@signed.pdf"

# Download bundle
curl -L "https://hub.abler.tirol/api/signpacks/<ID>/bundle.zip?token=<TOKEN>&destroy=true" \
  -o bundle.zip

# Delete
curl -X DELETE "https://hub.abler.tirol/api/signpacks/<ID>?token=<TOKEN>"
```

---

### Dev Utilities — `/api/utils`

| Endpoint | Description |
|---|---|
| `GET /api/utils/echo` | Request info: IP, method, headers, timestamp |
| `GET /api/utils/id?type=uuid\|ulid&count=1` | ID generator |
| `POST /api/utils/slugify` | `{ text, lower?, strict?, delimiter? }` |
| `POST /api/utils/hash?algo=sha256\|md5\|bcrypt` | `{ data, saltRounds? }` |
| `POST /api/utils/md2html` | `{ markdown }` → sanitized HTML |

---

## API Keys & Subscription Tiers

API keys are issued manually. Send a short email to **simon@abler.tirol** — response within 24 hours.

Use the key via header: `x-api-key: sk_pro_...`

| Feature | Free | Pro | Industrial |
|---|---|---|---|
| Standard Barcodes (PNG/SVG) | ✅ | ✅ | ✅ |
| QR Codes | ✅ | ✅ | ✅ |
| GS1 AI Registry Lookup | ✅ | ✅ | ✅ |
| GS1-128 / DataMatrix | ❌ | ✅ | ✅ |
| GS1 Digital Link encode/decode | ❌ | ✅ | ✅ |
| SSCC Generator (build/validate/auto) | ❌ | ✅ | ✅ |
| GS1 Batch (up to 100/request) | ❌ | ❌ | ✅ |
| Rate limit | 10 req/min | 100 req/min · 10k/day | 1k req/min · unlimited |
| Price | €0 | €29/month | €99/month |

---

## Font Server — `/fonts`

The backend self-hosts all fonts used across the `abler.tirol` ecosystem. No Google Fonts — DSGVO-konform by design.

| Endpoint | Description |
|---|---|
| `GET /fonts/abler-stack.css` | Combined `@font-face` stylesheet for all three font families |
| `GET /fonts/files/:filename` | Individual woff2 files |

**Usage in any abler.tirol frontend:**

```html
<link rel="preconnect" href="https://api.abler.tirol" />
<link rel="stylesheet" href="https://api.abler.tirol/fonts/abler-stack.css" />
```

**Font stack:**

| Family | Weights | Role |
|---|---|---|
| `DM Serif Display` | 400 normal + italic | Headlines, Hero-Titel |
| `Inter` | 300 · 400 · 500 · 600 | Body, UI |
| `DM Mono` | 400 · 500 | Code, Tags, Badges |

Font files are sourced from `@fontsource` npm packages and committed to `apps/server/src/assets/fonts/files/`. They are copied to `dist/` at build time via the webpack asset pipeline.

---

## Deployment

### Domain Routing

Both `hub.abler.tirol` and `api.abler.tirol` are routed identically via Traefik:

- `/api/*` and `/fonts/*` → backend (port 3000)
- all other paths → frontend (port 80)

See `docker-compose.yml` for the exact Traefik label configuration.

---

### Docker

```bash
# Build backend
docker build -f dockerfiles/Dockerfile.backend -t simonapi-backend .

# Run with SQLite (persistent volume)
docker run -d --name simonapi-backend -p 3000:3000 \
  -e NODE_ENV=production \
  -e TYPEORM_DB=/data/db.sqlite \
  -v $(pwd)/data:/data \
  simonapi-backend

# Run with PostgreSQL
docker run -d --name simonapi-backend -p 3000:3000 \
  -e NODE_ENV=production \
  -e TYPEORM_URL=postgres://user:pass@host:5432/db \
  simonapi-backend
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `production` enables optimisations |
| `TYPEORM_DB` | `./data/db.sqlite` | SQLite file path |
| `TYPEORM_URL` | — | PostgreSQL connection URL (overrides SQLite) |
| `DATA_DIR` | `./data/signpacks` | Signpack file storage path |
| `TOKEN_LENGTH` | `32` | Signpack token length |
| `FILE_MAX_BYTES` | `26214400` | Max upload size (25 MB) |
| `PURGE_CRON` | `0 * * * *` | Cron for expired signpack cleanup |

---

## Tests

```bash
# All backend tests
cd apps/server && npx jest --no-coverage

# Single suite
cd apps/server && npx jest src/app/barcode/sscc.spec.ts --no-coverage
```

Test suites: `gs1-validate` · `gs1-digital-link` · `gs1-error` · `sscc` (100 tests: buildSscc / validateSscc / validateGs1Prefix / mod10CheckDigit)

---

## Project Structure

```
apps/
  server/                   # NestJS backend
    src/app/
      barcode/              # GS1 + SSCC + standard barcodes
      qr/                   # QR code generator
      watermark/            # Image watermarking
      lock/                 # Swipe-to-open locks
      signpack/             # Document signing workflow
      utils/                # Dev utilities
      metrics/              # Usage metrics & stats
  simonapi/                 # Angular frontend
    src/app/
      features/
        home/               # Landing page
        barcode/            # Barcode + GS1 + SSCC generator UI
        qr/                 # QR generator UI
        watermark/          # Watermark UI
        lock/               # Lock admin + public UI
        stats/              # Stats dashboard
        dev-utils/          # Dev utilities UI
      layout/               # Navbar, footer, cookie banner
```

---

## Fair Use

Free tier is open for personal and light commercial use — no scraping, no abuse. Rate limits and changes may apply at any time. No warranties given; use at your own risk.

For commercial integrations or SLA requirements please get in touch: **simon@abler.tirol**

---

## Privacy & Cookies

The Angular frontend ships with a first-party cookie banner. The consent status is stored in `simonapi-consent` (SameSite=Lax, 180 days). No analytics scripts, no third-party cookies. The home page loads an avatar from `gravatar.com` which may process the visitor's IP.

---

Swagger UI: **https://api.abler.tirol/api** (also reachable at `https://hub.abler.tirol/api`)
