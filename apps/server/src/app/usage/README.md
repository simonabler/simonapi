# Usage Monitoring Module

Zählt Aufrufe pro Route/Key und erzwingt Limits (pro Minute/Tag). Bietet Admin-Endpunkte für Einblick und Reset.

- Basisroute: `/_usage` (ohne `/api`-Prefix)
- Header: `x-admin-token: <token>` für Admin-Aktionen (Token über Module-Optionen konfiguriert)

## Endpunkte
- `GET /_usage/stats` – Übersicht (Totals, perRoute, Regeln). Erfordert Admin-Token.
- `POST /_usage/reset` – Zähler zurücksetzen (204). Erfordert Admin-Token.

## Optionen (UsageModule.forRoot)
- `defaultRule`: `{ perMinute?, perDay? }`
- `pathRules`: Record<pathPattern, `{ perMinute?, perDay? }`>
- `adminToken`: string – für die Admin-Endpunkte

## Funktionsweise
- Schlüssel pro Nutzer aus Header `x-api-key` oder Fallback IP (siehe app.module.ts Throttler getTracker)
- Pfade werden normalisiert; Zähler in Minuten- und Tag-Buckets

Hinweis: Zusätzlich ist global der Throttler aktiv (Rate-Limit). Dieses Modul ist ergänzend und separat konfigurierbar.
