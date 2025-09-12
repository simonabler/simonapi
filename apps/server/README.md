# Server (NestJS) – Simon API Hub

Backend-Services für Barcodes/GS1, QR-Codes, Watermarking, Utility-Endpunkte und Signpacks. Läuft mit NestJS, globalem Prefix `/api` und Swagger-UI unter `/api`.

## Schnellstart

- Install: `npm install`
- Dev-Start: `nx run server:serve` oder `npm run start`
- Swagger: `http://localhost:3000/api`
- Globales Prefix: alle Routen unter `/api/...`

## Umgebung (ENV)

- `PORT` (default `3000`)
- `TYPEORM_URL` Postgres-URL (optional). Wenn gesetzt → Postgres; sonst SQLite.
- `TYPEORM_DB` Pfad der SQLite-DB (default `./signpacks.sqlite`)
- `FILE_MAX_BYTES` Upload-Limit für Signpacks (default 25 MiB)
- Throttling: per `@nestjs/throttler` konfiguriert; Standard 100 req/60s pro IP/API-Key.

## Features / Routen

- Barcode: `/api/barcode` – Standardbarcodes (PNG/SVG), GS1 (PNG/SVG), Registry
- QR: `/api/qr` – QR aus diversen Datentypen (PNG/SVG)
- Watermark: `/api/watermark/apply` – Wasserzeichen (Logo/Text) via multipart/form-data
- Utils: `/api/utils` – Echo/IDs/Slugify/Hash/Markdown
- Signpacks: `/api/signpacks` – Upload/Verwaltung signierter Dateien mit Token

Details pro Modul: siehe je Modul-README unter `apps/server/src/app/<module>/README.md`.

## Ordnerstruktur (Auszug)

- `src/main.ts` – Bootstrap mit globalem Prefix und Swagger
- `src/app/app.module.ts` – Module, Throttling, Config, TypeORM
- `src/app/barcode` – Barcode/GS1
- `src/app/qr` – QR Codes
- `src/app/watermark` – Bild-Wasserzeichen
- `src/app/utils` – Dienstprogramme
- `src/app/signpack` – Signpack-Flow inkl. Downloads
- `src/assets/watermark` – optionales Default-Logo

## Proxy/CORS

- CORS ist aktiviert. Frontend spricht i. d. R. gegen `/api` (Relativ-URL) oder gegen `API_BASE_URL` des Frontends.

