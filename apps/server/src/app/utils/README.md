# Utilities API

Diverse Hilfsendpunkte.

- Basisroute: `/api/utils`

## Echo
- `GET /api/utils/echo` → Request-Infos (IP, Method, URL, Headers, Timestamp)

## IDs
- `GET /api/utils/id?type=uuid|ulid&count=1` → generiert IDs

## Slugify
- `POST /api/utils/slugify` `{ text: string, lower?, strict?, delimiter? }` → `{ input, slug }`

## Hashing
- `POST /api/utils/hash?algo=md5|sha256|bcrypt` Body `{ data, saltRounds? }`
  - Antwort: `{ algo, hash }` (oder `{ algo: 'bcrypt', saltRounds, hash }`)

## Markdown → HTML
- `POST /api/utils/md2html` `{ markdown: string }` → `{ html }` (sanitisiert)

## Beispiele
```
# Echo
curl http://localhost:3000/api/utils/echo

# ULID x5
curl "http://localhost:3000/api/utils/id?type=ulid&count=5"

# Slugify
curl -X POST http://localhost:3000/api/utils/slugify -H "Content-Type: application/json" -d '{"text":"Äpfel & Öl – groß!"}'

# SHA256
curl -X POST "http://localhost:3000/api/utils/hash?algo=sha256" -H "Content-Type: application/json" -d '{"data":"hello"}'

# Markdown
curl -X POST http://localhost:3000/api/utils/md2html -H "Content-Type: application/json" -d '{"markdown":"# Titel"}'
```
