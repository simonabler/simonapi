# Barcode API

Standard-Barcodes (Code128, EAN, etc.) sowie GS1 (GS1-128, DataMatrix).

- Basisroute: `/api/barcode`

## Standard-Barcodes

- `GET /api/barcode/png` → PNG-Bild
- `GET /api/barcode/svg` → SVG-String

Query-Parameter (GenerateBarcodeDto):
- `type`: `code128|ean13|ean8|upca|code39|itf14|pdf417|datamatrix`
- `text`: Inhalt
- `includetext` (bool, optional)
- `scale` (1..10, optional)
- `height` (1..200, optional – 1D)

Beispiel:
```
curl "http://localhost:3000/api/barcode/png?type=code128&text=HELLO&includetext=true&scale=3" -o code128.png
```

## GS1-Barcodes

- `POST /api/barcode/gs1/png` → PNG
- `POST /api/barcode/gs1/svg` → SVG
- `POST /api/barcode/gs1/render` → je nach `format` PNG (binary) oder SVG (text)
- `GET /api/barcode/gs1/registry` → AI-Registry (JSON) für Frontend

Body (GenerateGs1BodyDto / QueryDto):
- `symbology`: `gs1-128` | `gs1datamatrix`
- `format`: `png` | `svg` (nur `/render`)
- `items`: Array `{ ai: string; value: string }[]`
- `includetext?`, `scale?`, `height?`

Beispiel:
```
curl -X POST http://localhost:3000/api/barcode/gs1/render \
  -H "Content-Type: application/json" \
  -d '{
    "symbology":"gs1-128",
    "format":"png",
    "items":[{"ai":"01","value":"09506000134352"},{"ai":"17","value":"250101"},{"ai":"10","value":"LOT1"}],
    "includetext":true,
    "scale":3
  }' \
  -o gs1.png
```
