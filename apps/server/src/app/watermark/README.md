# Watermark API

Wasserzeichen (Logo oder Text) auf Bilder anwenden. Multipart-Upload und Optionen.

- Basisroute: `/api/watermark`
- Endpoint: `POST /api/watermark/apply`
- Antwort: Bild-Blob (PNG/JPEG/WEBP/AVIF je nach Upload bzw. Pipeline)

## Upload-Felder (multipart/form-data)

Pflicht:
- `file`: Bild (jpeg/png/webp/avif)
- `mode`: `logo` | `text`

Optional:
- `logo`: Bilddatei für `mode=logo` (falls nicht gesendet, wird optional ein Default-Logo geladen, wenn vorhanden)
- `position`: String `"x,y"` – absolute Position in Pixel (überschreibt `anchor`/`margin`)
- `anchor`: `bottom-right` | `bottom-center` | `bottom-left` | `center-right` | `center` | `center-left` | `top-right` | `top-center` | `top-left`
- `opacity`: 0..1 (Default 0.5)
- `scale`: relative Breite bei Logo, bzw. Text-Skalierung (Default 0.2 bei Logo)
- `margin`: Rand in px für Anchor-Positionen (Default 24)
- `rotate`: Grad (Default 0; bei Tile z. B. -30)
- `tile`: boolean – Muster über das ganze Bild (besonders für Text sinnvoll)
- `gap`: px – Abstand beim Tile-Muster
- `text`: nur bei `mode=text`
- `fontSize`, `fontFamily`, `color`, `strokeColor`, `strokeWidth`
- `download`: boolean – erzwinge Download (Content-Disposition)

Hinweis: `position` (x,y) hat Vorrang vor `anchor` + `margin`.

## Beispiel (cURL)

Text absolut positionieren:

```
curl -X POST http://localhost:3000/api/watermark/apply \
  -F "mode=text" \
  -F "file=@/path/image.jpg" \
  -F "text=© Demo 2025" \
  -F "position=120,240" \
  -o out.jpg
```

Logo per Anchor unten rechts mit 24px Rand:

```
curl -X POST http://localhost:3000/api/watermark/apply \
  -F "mode=logo" \
  -F "file=@/path/image.jpg" \
  -F "logo=@/path/logo.png" \
  -F "anchor=bottom-right" -F "margin=24" \
  -F "opacity=0.5" -F "scale=0.2" \
  -o out.jpg
```

## Default-Logo

Wenn kein `logo` gesendet wird, versucht der Service, ein Default-Logo zu laden:
- `apps/server/src/assets/watermark/default-logo.png`
- `dist/apps/server/assets/watermark/default-logo.png`

Lege dort optional eine Datei ab.
