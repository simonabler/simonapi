# QR API

Erzeugt QR-Codes aus verschiedenen Datentypen als SVG oder PNG.

- Route: `POST /api/qr`
- Body: `GenerateQrDto`
- Optionaler Query-Param: `download=1` zum erzwungenen Download

## Body-Felder

- `type`: Datentyp (`url|text|email|phone|sms|vcard|wifi`)
- `payload`: Objekt – Struktur abhängig von `type` (siehe Swagger)
- `format?`: `svg|png` (Default `svg`)
- `size?`: 64..4096 (px)
- `margin?`: 0..20 (Module)
- `ecc?`: `L|M|Q|H`

## Beispiele

```
# URL → SVG
curl -X POST http://localhost:3000/api/qr \
  -H "Content-Type: application/json" \
  -d '{"type":"url","payload":{"url":"https://example.com"},"format":"svg","size":512,"margin":2,"ecc":"M"}'

# Text → PNG Download
curl -L "http://localhost:3000/api/qr?download=1" \
  -H "Content-Type: application/json" \
  -d '{"type":"text","payload":{"text":"Hello"},"format":"png","size":256}' \
  -o qr.png
```
