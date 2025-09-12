# Lock Module (NestJS)

Admin-API für Schlösser, Gruppen, zeitlich begrenzte Access-Links und Event-Logs.
Beinhaltet Provider-Registry (Webhook/DB/RabbitMQ) zum Öffnen von Schlössern.

## Setup

- `PUBLIC_BASE_URL=https://hub.abler.tirol`
- `AMQP_URL=amqp://user:pass@rabbitmq:5672` (falls RabbitMQ-Provider genutzt wird)

Füge `LockModule` in dein `AppModule` ein und stelle sicher, dass `TypeOrmModule.forRoot(...)`
in deinem Projekt konfiguriert ist.

## Admin-Routen

- POST   /admin/locks
- PATCH  /admin/locks/:id
- GET    /admin/locks
- GET    /admin/locks/:id
- POST   /admin/lock-groups
- PATCH  /admin/lock-groups/:id
- POST   /admin/lock-groups/:id/members
- POST   /admin/lock-groups/:id/members/remove
- POST   /admin/access-links
- GET    /admin/access-links
- PATCH  /admin/access-links/:id
- GET    /admin/events

## Public (Beispiel)

- POST   /lock/open (Demo; in echt mit Link/Token prüfen)
