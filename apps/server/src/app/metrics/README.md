# Metrics + Anomaly Guard (NestJS)

Drop-in Modul für `apps/server/src/app/metrics` in deinem NX/NestJS-Backend.
Misst API-Aufrufe, liefert `/ _stats` und sperrt automatisch verdächtige Clients.

## Installation

1. Kopiere den Ordner `apps/server/src/app/metrics` in dein Projekt.
2. **AppModule** erweitern:
   ```ts
   import { Module } from '@nestjs/common';
   import { MetricsModule } from './metrics/metrics.module';

   @Module({
     imports: [MetricsModule],
   })
   export class AppModule {}
   ```
3. ENV-Variablen (optional) setzen:
   - `ANOMALY_BURST_PER_MIN` (Default 120)
   - `ANOMALY_SUSTAINED_PER_5MIN` (Default 300)
   - `ANOMALY_UNIQUE_ROUTES_PER_MIN` (Default 40)
   - `ANOMALY_ERROR_RATIO` (Default 0.6)
   - `ANOMALY_MIN_ERR_SAMPLES` (Default 50)

## Endpoints

- `GET /_stats` – JSON Snapshot (Zähler, Latenzen pro Route, daily)
- `GET /_stats/reset` – Setzt Zähler zurück
- `GET /_stats/security` – Aktive Bann-Einträge
- `GET /_stats/security/unban?ip=1.2.3.4` – Entbannt eine IP

> Die `_stats`-Routen zählen nicht in die Metriken hinein.

## Routen vom Zählen/Sperren ausnehmen

```ts
import { SkipMetrics } from './metrics/metrics.decorator';
import { SkipAnomalyGuard } from './metrics/anomaly.guard';

@SkipMetrics()
@SkipAnomalyGuard()
@Get('healthz')
health() { return 'ok'; }
```

## Hinweise

- **In-Memory**: Für verteilte Deployments Blocklist und Zähler auf Redis heben.
- **Proxy**: Nur `X-Forwarded-For` verwenden, wenn dein Reverse-Proxy korrekt gesetzt ist.
- **HTTP 429**: Guard wirft ForbiddenException mit Status 429. Passe ggf. deinen Exception-Filter an.
