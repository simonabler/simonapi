# Simon API Hub

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

Production-grade NestJS/Nx backend bundling QR/Barcode/GS1, a Signpack microservice, and utility endpoints.

## Overview

This server aggregates several small, useful micro‑APIs (QR/Barcode generator, Signpack, developer utilities) behind a single backend. Optionally, an Angular frontend can display per‑API docs with cURL examples and simple demos.

## Features

- Multiple REST APIs in a single NestJS monorepo (one module per feature)
- Optional Angular frontend: docs and mini‑apps for each API
- OpenAPI/Swagger for the backend (Swagger UI: `/api`)
- Docker friendly (local and home‑server)
- Fair‑use/rate‑limit via `@nestjs/throttler`
- Optional usage stats (requests/min, per‑route metrics, error rate)

## Architecture

- Backend (NestJS)
  - Feature modules: `qr`, `barcode`, `signpack`, `utils`, `reports`, optional `usage`
  - Controller → Service → (optional) Repository (TypeORM)
  - Swagger served at `/api`
- Frontend (Angular, optional)
  - Pages: overview, API details, live demos
  - Code examples and cURL snippets
- Reverse proxy (optional)
  - e.g. nginx/Caddy in front of backend/frontend

[Learn more about this workspace](https://nx.dev/getting-started/tutorials/angular-monorepo-tutorial?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or run `npx nx graph` to explore.

## Modules (Server)

- Root: `GET /api/` — health/info with a simple message.
- Barcode: base `GET /api/barcode/*`
  - Standard barcodes: `GET /api/barcode/png|svg?type=<code128|ean13|ean8|upca|code39|itf14|pdf417|datamatrix>&text=...&includetext=true&scale=3&height=...`
  - GS1 barcodes (validated & check digits):
    - `GET /api/barcode/gs1/png|svg?symbology=gs1-128|gs1datamatrix&items=[{ai,value},...]&includetext=true&scale=3&height=...`
    - `POST /api/barcode/gs1/render { symbology, format, items, includetext?, scale?, height? }`
- QR: base `POST /api/qr`
  - Generate QR as `svg` (default) or `png`
  - Body: `{ type: 'url'|'text'|'email'|'phone'|'sms'|'vcard'|'wifi', payload: {...}, format?: 'svg'|'png', size?: 512, margin?: 2, ecc?: 'L'|'M'|'Q'|'H' }`
  - Optional: `?download=1` forces file download (sets `Content-Disposition`).
- Watermark: base `/api/watermark`
  - `POST /api/watermark/apply` (multipart): add logo/text watermark to an image.
    - Files: `file` (required), `logo` (optional, required if `mode=logo` unless default asset exists)
    - Fields: `mode=logo|text`, `position=center|top-left|top-right|bottom-left|bottom-right|top-center|bottom-center|center-left|center-right` (default: `bottom-right`),
      `opacity` (0..1, default `0.5`), `scale` (logo width ratio, default `0.2`), `margin` (px, default `24`), `rotate` (deg, default `0`),
      `tile` (boolean, default `false`), `gap` (px for tiling, default `128`). Text mode also supports `text`, `fontSize`, `fontFamily`, `color`, `strokeColor`, `strokeWidth`.
    - Accepts/returns: JPEG, PNG, WebP, AVIF (keeps original format when possible). Optional `download=true` forces download.
- Signpack: base `/api/signpacks`
  - `POST /api/signpacks` (multipart) → create pack from upload; returns `{ id, token, links... }`
  - `GET /api/signpacks/:id/meta|original|signed?token=...`
  - `POST /api/signpacks/:id/sign?token=...` (multipart `file` or JSON `{ remoteUrl }`)
  - `GET /api/signpacks/:id/bundle.zip?token=...[&destroy=true]`
  - `DELETE /api/signpacks/:id?token=...`
- Utils: base `/api/utils`
  - `GET /api/utils/echo` — request info (IP, method, headers, timestamp)
  - `GET /api/utils/id?type=uuid|ulid&count=1` — ID generator
  - `POST /api/utils/slugify` — `{ text, lower?, strict?, delimiter? }`
  - `POST /api/utils/hash?algo=sha256|md5|bcrypt` — `{ data, saltRounds? }`
  - `POST /api/utils/md2html` — `{ markdown }` → sanitized HTML
- Reports: base `/api/reports`
  - `GET /api/reports/public` — public example
  - `GET /api/reports/heavy` — example route with custom throttling
  - `GET /api/reports/ratelimit` — returns current rate‑limit headers snapshot
- Usage (optional): base `/api/_usage`
  - Enable by importing `UsageModule.forRoot({ defaultRule?, pathRules?, adminToken? })` in `app.module.ts`
  - `GET /api/_usage/stats` (requires header `x-admin-token`)
  - `POST /api/_usage/reset` (requires header `x-admin-token`)

## API Examples

Server runs on port 3000 by default. Swagger UI: https://hub.abler.tirol/api

- Barcode — standard PNG (Code128)
  ```bash
  curl -L "https://hub.abler.tirol/api/barcode/png?type=code128&text=Hello123&includetext=true" -o code128.png
  ```

- Barcode — standard SVG (EAN-13)
  ```bash
  curl -L "https://hub.abler.tirol/api/barcode/svg?type=ean13&text=5901234123457&includetext=true" -o ean13.svg
  ```

- GS1-128 via POST (GTIN → auto check digit)
  ```bash
  curl -X POST https://hub.abler.tirol/api/barcode/gs1/render \
    -H "Content-Type: application/json" \
    -d '{
          "symbology":"gs1-128",
          "format":"png",
          "includetext":true,
          "scale":3,
          "height":12,
          "items":[
            {"ai":"01","value":"0950600013437"},
            {"ai":"10","value":"BATCH42"},
            {"ai":"17","value":"251231"}
          ]
        }' -o gs1-128.png
  ```

- QR — URL to SVG (inline)
  ```bash
  curl -X POST https://hub.abler.tirol/api/qr \
    -H "Content-Type: application/json" \
    -d '{
          "type":"url",
          "payload": { "url": "https://example.com" },
          "format":"svg",
          "size": 512,
          "margin": 2,
          "ecc": "M"
        }'
  ```

- QR — WiFi as PNG (download)
  ```bash
  curl -L "https://hub.abler.tirol/api/qr?download=1" \
    -H "Content-Type: application/json" \
    --data '{
      "type":"wifi",
      "payload": { "ssid": "MyWifi", "password": "secret", "encryption":"WPA", "hidden": false },
      "format":"png"
    }' -o wifi.png
  ```

- Watermark — text watermark (bottom-right)
  ```bash
  curl -X POST https://hub.abler.tirol/api/watermark/apply \
    -F "file=@./photo.jpg" \
    -F "mode=text" \
    -F "text=© Ematric 2025" \
    -F "position=bottom-right" \
    -F "opacity=0.5" \
    -o watermarked.jpg
  ```

- Watermark — logo watermark (scale 20%)
  ```bash
  curl -X POST https://hub.abler.tirol/api/watermark/apply \
    -F "file=@./photo.jpg" \
    -F "logo=@./logo.png" \
    -F "mode=logo" \
    -F "scale=0.2" \
    -F "position=bottom-right" \
    -F "opacity=0.5" \
    -o watermarked.jpg
  ```

- Watermark — tiled text pattern
  ```bash
  curl -X POST https://hub.abler.tirol/api/watermark/apply \
    -F "file=@./photo.png" \
    -F "mode=text" \
    -F "text=CONFIDENTIAL" \
    -F "tile=true" \
    -F "gap=160" \
    -F "rotate=-30" \
    -F "opacity=0.2" \
    -o watermarked.png
  ```

- Signpack — upload (multipart)
  ```bash
  curl -X POST https://hub.abler.tirol/api/signpacks \
    -F file=@./example.pdf \
    -F expiresInMinutes=60
  # Response contains { id, token, ... }
  ```

- Signpack — fetch metadata
  ```bash
  curl "https://hub.abler.tirol/api/signpacks/<ID>/meta?token=<TOKEN>"
  ```

- Signpack — download original
  ```bash
  curl -L "https://hub.abler.tirol/api/signpacks/<ID>/original?token=<TOKEN>" -o original.bin
  ```

- Signpack — upload signed file (multipart)
  ```bash
  curl -X POST "https://hub.abler.tirol/api/signpacks/<ID>/sign?token=<TOKEN>" \
    -F file=@./signed.pdf
  ```

- Signpack — provide signed file via remote URL
  ```bash
  curl -X POST "https://hub.abler.tirol/api/signpacks/<ID>/sign?token=<TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{"remoteUrl":"https://example.com/file.pdf"}'
  ```

- Signpack — download bundle (+ optional destroy)
  ```bash
  curl -L "https://hub.abler.tirol/api/signpacks/<ID>/bundle.zip?token=<TOKEN>&destroy=true" -o bundle.zip
  ```

- Signpack — delete immediately
  ```bash
  curl -X DELETE "https://hub.abler.tirol/api/signpacks/<ID>?token=<TOKEN>"
  ```

## Deployment (Docker)

Example backend deployment with the provided Dockerfile:

```bash
# Build
docker build -f dockerfiles/Dockerfile.backend -t simonapi-backend .

# Run (persistent data + SQLite)
docker run -d --name simonapi-backend -p 3000:3000 \
  -e NODE_ENV=production \
  -e TYPEORM_DB=/data/signpacks/signpacks.sqlite \
  -v $(pwd)/data:/data/signpacks \
  simonapi-backend

# Alternatively use Postgres
# -e TYPEORM_URL=postgres://user:pass@host:5432/db
```

Notes (Signpack): files are stored under `DATA_DIR` (default `./data/signpacks`), database path via `TYPEORM_DB` (SQLite default) or `TYPEORM_URL` (Postgres). Optional envs: `FILE_MAX_BYTES`, `TOKEN_LENGTH`, `PURGE_CRON`.

## Run Tasks

Start dev server:

```sh
npx nx serve server
```

Production build:

```sh
npx nx build server
```

Show available targets for a project:

```sh
npx nx show project server
```

These targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks »](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Configuration (ENV)

- DATA_DIR: storage path (default: `./data/signpacks`)
- TOKEN_LENGTH: token length (default: `32`)
- FILE_MAX_BYTES: max upload size in bytes (default: `26214400`)
- PURGE_CRON: cron expression for cleanup (default: `0 * * * *` — hourly)
- TYPEORM_DB: SQLite file path (default: `./signpacks.sqlite`)
- TYPEORM_URL: Postgres connection URL (enables Postgres, overrides `TYPEORM_DB`)

Swagger UI: https://hub.abler.tirol/api

## Disclaimer ("AS IS")

The software is provided "AS IS", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and noninfringement. In no event shall the authors be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.

Usage: strictly non‑commercial. For commercial use, please get in touch beforehand.

## Contributors

Contributions are welcome — please see the license. For larger changes, open an issue first and describe your plan.
