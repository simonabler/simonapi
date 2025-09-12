# Signpacks API

Erstellt „Signpacks“ aus Uploads, verwaltet Meta-Daten, erlaubt Upload der signierten Version und Download eines Bundles. Zugriff via Token im Query.

- Basisroute: `/api/signpacks`

## Flow
1) `POST /api/signpacks` (multipart) – Felder: `file` (binary), optional `expiresInMinutes`
   - Antwort enthält `id`, `token` und Links mit `?token=...`
2) Meta abrufen: `GET /api/signpacks/:id/meta?token=...`
3) Original herunterladen: `GET /api/signpacks/:id/original?token=...`
4) Signierte Datei hochladen:
   - Multipart: `POST /api/signpacks/:id/sign?token=...` Feld `file`
   - Oder remoteUrl: JSON-Body `{ "remoteUrl": "https://..." }`
5) Signierte Version abrufen: `GET /api/signpacks/:id/signed?token=...`
6) Bundle (ZIP) laden: `GET /api/signpacks/:id/bundle.zip?token=...&destroy=true|false`
7) Pack löschen: `DELETE /api/signpacks/:id?token=...`

## Limits & Storage
- Upload-Limit über `FILE_MAX_BYTES` (default 25 MiB)
- Storage via TypeORM (SQLite default oder Postgres über `TYPEORM_URL`)

## Beispiele
```
# 1) Create
curl -X POST http://localhost:3000/api/signpacks \
  -F "file=@/path/document.pdf" -F "expiresInMinutes=120"

# 4) Upload signed
curl -X POST "http://localhost:3000/api/signpacks/<ID>/sign?token=<TOKEN>" \
  -F "file=@/path/document-signed.pdf"

# 6) Bundle and destroy afterwards
curl -L "http://localhost:3000/api/signpacks/<ID>/bundle.zip?token=<TOKEN>&destroy=true" -o bundle.zip
```
