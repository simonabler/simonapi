# Watermark Feature (Frontend)

Diese Funktion stellt ein eigenständiges Frontend zur Wasserzeichen-Erzeugung bereit. Es nutzt die bestehende API `POST /watermark/apply` und unterstützt Drag & Drop Upload, Formularoptionen sowie eine Live-Preview mit Debounce.

Pfad der Dateien: `apps/simonapi/src/app/features/watermark/`

## Einbindung (Lazy Routing, Standalone)

In `apps/simonapi/src/app/app.routes.ts` ist die Lazy-Route als Standalone-Component registriert:

```ts
{ path: 'tools/watermark', loadComponent: () => import('./features/watermark/watermark-uploader/watermark-uploader.component').then(c => c.WatermarkUploaderComponent) }
```

## Modul

`WatermarkUploaderComponent` ist standalone und importiert:
- `CommonModule`, `ReactiveFormsModule`, `FormsModule`, sowie die standalone `DndDirective`.

Es gibt kein NgModule mehr für dieses Feature.

## Service / API

`watermark.service.ts` enthält `apply(file: File, opts: WatermarkOptions, logo?: File): Observable<Blob>`.
Es sendet `multipart/form-data` an `/api/watermark/apply` (bzw. relativ gemäß Environment) mit den Feldern aus `WatermarkOptions`:

```
mode ('logo'|'text'),
position? ("x,y" absolute) ODER anchor? ('bottom-right' | ...),
opacity, scale, margin, rotate, tile, gap,
text, fontSize, fontFamily, color, strokeColor, strokeWidth, download
```

Hinweis: Wenn `position` (x,y) gesetzt ist, überschreibt sie `anchor`/`margin`.

Die Response ist ein `Blob` (Bild). Die Preview nutzt ein `ObjectURL`.

## Drag & Drop

`dnd.directive.ts` implementiert eine einfache DnD-Direktive (`appDnd`),
die beim Hover die Klasse `.dnd-over` setzt und beim Drop die `FileList` über `fileDropped` ausgibt.

## UI / UX

- Zwei Dropzonen (Hauptbild Pflicht, Logo optional)
- Card-Layout mit Bootstrap-Klassen
- Formular steuert alle Optionen; Auto-Preview (Debounce ~500ms)
- Positionierung: Umschaltbar zwischen Absolut (x,y, Drag&Drop in der Preview) und Anchor (mit Rand)
- Live-Preview über Blob-URL; Text/Logo kann in der Preview per Maus positioniert werden (bei Absolut)
- Download-Button lädt die generierte Datei herunter
- Fehleranzeige via `.alert.alert-danger`

## Hinweise

- API-URL ist relativ (`/watermark/apply`); bestehende Proxy-Konfigurationen werden nicht verändert.
- Für Drag & Drop wird keine externe Library verwendet.
- Es werden `ReactiveFormsModule` und `HttpClientModule` ausschließlich im Feature-Modul importiert.

## Manuelle Checks

1. `nx serve simonapi`
2. Browser: `http://localhost:4200/tools/watermark`
3. Bild ziehen/hochladen, Einstellungen ändern, Auto-Preview prüfen, Download testen
