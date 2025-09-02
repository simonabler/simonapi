# Simon API Hub

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

Produktionsnahes NestJS/Nx-Backend mit Barcodes/GS1 und Signpack-Service.

## Überblick

Dieser Server bündelt mehrere kleine, nützliche Micro-APIs (z. B. QR-/Barcode-Generator, Signpack, Dev/Utility-Tools) hinter einer einheitlichen Oberfläche. Optional kann ein Angular-Frontend ergänzend eine Doku pro API mit Beispielaufrufen (cURL) und einfache Demo-Ansichten anzeigen.

## Features

- Mehrere REST-APIs in einem NestJS-Monorepo (Module je Feature)
- Angular-Frontend (optional): Doku & Mini-Apps zu jeder API
- OpenAPI/Swagger fürs Backend (Swagger UI: `/api`)
- Docker-fähig (lokal & Home-Server)
- Fair-Use/Rate-Limit (optional via `@nestjs/throttler`)
- Statistiken (optional; z. B. Requests/Minute, Top-Endpunkte, Fehlerquote)

## Architektur

- Backend (NestJS)
  - Module je API (z. B. `qrcode`, `barcode`, `signpack`, `utils`)
  - Controller → Service → (optional) Repository (TypeORM)
  - Swagger unter `/api`
- Frontend (Angular) – optional
  - Seiten: Übersicht, API-Details, Live-Demos
  - Code-Beispiele & cURL-Snippets
- Reverse Proxy (optional)
  - z. B. nginx/Caddy vor Backend/Frontend

[Learn more about this workspace setup and its capabilities](https://nx.dev/getting-started/tutorials/angular-monorepo-tutorial?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects) or run `npx nx graph` to visually explore what was created. Now, let's get you up to speed!

## Funktionsumfang

- Barcodes/GS1
  - Standard-Barcodes: code128, ean13, ean8, upca, code39, itf14, pdf417, datamatrix
  - GS1: GS1-128 & GS1 DataMatrix mit AI-Auswahl, Validierung (GTIN/SSCC Mod10, Datum YYMMDD, Längen/ASCII) und automatischer Prüfziffer-Ergänzung
  - PNG & SVG Ausgabe; Endpunkte: GET /barcodes/png|svg, GET /barcodes/gs1/png|svg, POST /barcodes/gs1/render
  - Swagger/OpenAPI unter /api
- Signpack Microservice
  - Upload → Signieren → Abrufen → optionales Destroy; Speicherung lokal unter DATA_DIR (Default ./data/signpacks)
  - Endpunkte: POST /api/signpacks, GET /:id/meta|original|signed, POST /:id/sign (multipart oder {remoteUrl}), GET /:id/bundle.zip[&destroy=true], DELETE /:id
  - TypeORM (SQLite Standard, Postgres via TYPEORM_URL), Cron-Aufräumen stündlich, einfache Rate-Limits

## API Beispiele

Beachte: Standardmäßig läuft der Server auf Port 3000. Swagger UI: http://localhost:3000/api

- Barcodes – Standard PNG (Code128)
  ```bash
  curl -L "http://localhost:3000/barcodes/png?type=code128&text=Hello123&includetext=true" -o code128.png
  ```

- Barcodes – Standard SVG (EAN-13)
  ```bash
  curl -L "http://localhost:3000/barcodes/svg?type=ean13&text=5901234123457&includetext=true" -o ean13.svg
  ```

- GS1-128 via POST (GTIN 13-stellig → Prüfziffer automatisch)
  ```bash
  curl -X POST http://localhost:3000/barcodes/gs1/render \
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

- GS1 DataMatrix mit SSCC 17-stellig → Prüfziffer automatisch
  ```bash
  curl -X POST http://localhost:3000/barcodes/gs1/render \
    -H "Content-Type: application/json" \
    -d '{
          "symbology":"gs1datamatrix",
          "format":"svg",
          "items":[
            {"ai":"00","value":"12345678901234567"},
            {"ai":"21","value":"SN-001"}
          ]
        }' -o sscc.svg
  ```

- Signpack – Upload (multipart)
  ```bash
  curl -X POST http://localhost:3000/api/signpacks \
    -F file=@./example.pdf \
    -F expiresInMinutes=60
  # Antwort enthält { id, token, ... }
  ```

- Signpack – Metadaten abrufen
  ```bash
  curl "http://localhost:3000/api/signpacks/<ID>/meta?token=<TOKEN>"
  ```

- Signpack – Original herunterladen
  ```bash
  curl -L "http://localhost:3000/api/signpacks/<ID>/original?token=<TOKEN>" -o original.bin
  ```

- Signpack – Signierte Datei hochladen (multipart)
  ```bash
  curl -X POST "http://localhost:3000/api/signpacks/<ID>/sign?token=<TOKEN>" \
    -F file=@./signed.pdf
  ```

- Signpack – Signierte Datei via Remote-URL
  ```bash
  curl -X POST "http://localhost:3000/api/signpacks/<ID>/sign?token=<TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{"remoteUrl":"https://example.com/file.pdf"}'
  ```

- Signpack – Bundle herunterladen (+ optionales Destroy)
  ```bash
  curl -L "http://localhost:3000/api/signpacks/<ID>/bundle.zip?token=<TOKEN>&destroy=true" -o bundle.zip
  ```

- Signpack – Sofort löschen
  ```bash
  curl -X DELETE "http://localhost:3000/api/signpacks/<ID>?token=<TOKEN>"
  ```

## Deployment (Docker)

Beispiel-Deployment des Backends mit bereitgestelltem Dockerfile:

```bash
# Build
docker build -f dockerfiles/Dockerfile.backend -t simonapi-backend .

# Run (persistente Daten + SQLite)
docker run -d --name simonapi-backend -p 3000:3000 \
  -e NODE_ENV=production \
  -e TYPEORM_DB=/data/signpacks/signpacks.sqlite \
  -v $(pwd)/data:/data/signpacks \
  simonapi-backend

# Alternativ: Postgres verwenden
# -e TYPEORM_URL=postgres://user:pass@host:5432/db
```


## Run tasks

Dev-Server starten:

```sh
npx nx serve server
```

Production-Build:

```sh
npx nx build server
```

Verfügbare Targets für ein Projekt anzeigen:

```sh
npx nx show project server
```

These targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Add new projects

While you could add new projects to your workspace manually, you might want to leverage [Nx plugins](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) and their [code generation](https://nx.dev/features/generate-code?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) feature.

Use the plugin's generator to create new projects.

To generate a new application, use:

```sh
npx nx g @nx/angular:app demo
```

To generate a new library, use:

```sh
npx nx g @nx/angular:lib mylib
```

You can use `npx nx list` to get a list of installed plugins. Then, run `npx nx list <plugin-name>` to learn about more specific capabilities of a particular plugin. Alternatively, [install Nx Console](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) to browse plugins and generators in your IDE.

[Learn more about Nx plugins &raquo;](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) | [Browse the plugin registry &raquo;](https://nx.dev/plugin-registry?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)


[Learn more about Nx on CI](https://nx.dev/ci/intro/ci-with-nx#ready-get-started-with-your-provider?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Konfiguration (ENV)

- DATA_DIR – Speicherpfad (Default: ./data/signpacks)
- TOKEN_LENGTH – Tokenlänge (Default: 32)
- FILE_MAX_BYTES – Max. Uploadgröße in Bytes (Default: 26214400)
- PURGE_CRON – Cron-Expression für Aufräumen (Default: 0 * * * *)
- TYPEORM_DB – SQLite-Datei (Default: ./signpacks.sqlite)
- TYPEORM_URL – Postgres Connection-URL (aktiviert Postgres, überschreibt TYPEORM_DB)

Swagger UI: http://localhost:3000/api

## Haftungsausschluss („AS IS“)

Die Software wird „AS IS“ bereitgestellt – ohne Gewährleistung jeglicher Art, ausdrücklich oder stillschweigend, einschließlich, aber nicht beschränkt auf Marktgängigkeit, Eignung für einen bestimmten Zweck und Nichtverletzung von Rechten. In keinem Fall haften die Autor:innen für Ansprüche, Schäden oder sonstige Haftung, sei es aus Vertrag, unerlaubter Handlung oder anderweitig, die aus der Software oder der Nutzung bzw. dem Umgang mit der Software entstehen.

Nutzung: ausschließlich nicht-kommerziell. Für kommerzielle Nutzung bitte vorher Kontakt aufnehmen.

## Beitragende

Beiträge sind willkommen – bitte beachte die Lizenz. Für größere Änderungen öffne vorab ein Issue und beschreibe dein Vorhaben.
