# Feature: Lock

Standalone-Feature mit Admin-Ansicht und öffentlicher Lock-Landingpage.

## Routen
- Admin: `/admin/lock` (lazy)
- Public: `/lock/:slug` (lazy, Token via `?t=`)

App-Router (`app.routes.ts`) enthält die Lazy-Routes:

```
{ path: 'admin/lock', loadChildren: () => import('./features/lock/lock.routes').then(m => m.LOCK_ADMIN_ROUTES) },
{ path: 'lock', loadChildren: () => import('./features/lock/lock.routes').then(m => m.LOCK_PUBLIC_ROUTES) }
```

`lock.routes.ts` exportiert beide Arrays, um getrennte Parent-Pfade zu unterstützen.

## Backend-Endpunkte (Erwartung)
- Admin (auth):
  - GET/POST/PATCH `/admin/locks[/:id]`
  - GET/POST/PATCH `/admin/lock-groups[/:id]`
  - POST `/admin/lock-groups/:id/members` (add), POST `/admin/lock-groups/:id/members/remove`
  - GET/POST/PATCH `/admin/access-links[/:id]`
  - GET `/admin/events` (Query: `from,to,lockId,linkId,result`)
- Public: 
  - GET `/public/locks?slug=...&t=...`
  - POST `/public/open` Body `{ slug, token, lockId, swipeNonce }`

## Service
`services/lock.api.ts` nutzt `environment.API_BASE_URL` und spricht relativ `/api` an.

## Hinweise
- AdminLockComponent: CRUD für Locks, Gruppen, Links; Events-Listing vorbereitet.
- PublicLockComponent: Liest `slug`/`t`, lädt Locks, Countdown, öffnet via Button (inkl. `swipeNonce`).
- UI nutzt Bootstrap-Klassen, Standalone Components, OnPush.

