# Konfiguration

Globales Config-Setup via `@nestjs/config` in `app.module.ts`:

- Lädt `.env.<NODE_ENV>`, `.env.local`, `.env` (in dieser Reihenfolge)
- Exportiert App-Config aus `app/config/app.config.ts`
- TypeORM: Postgres über `TYPEORM_URL` oder SQLite über `TYPEORM_DB`
- Throttling: siehe `ThrottlerModule.forRoot` in `app.module.ts`

Wichtige Variablen:
- `PORT`, `TYPEORM_URL`, `TYPEORM_DB`, `FILE_MAX_BYTES`

Swagger ist unter `/api` erreichbar (siehe `main.ts`).
