// app.routes.server.ts
import { RenderMode, ServerRoute } from '@angular/ssr';
export const serverRoutes: ServerRoute[] = [
  {
    path: '', // This renders the "/" route on the client (CSR)
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'qr', // This page is static, so we prerender it (SSG)
    renderMode: RenderMode.Server,
  },
  {
    path: 'barcode', // This page requires user-specific data, so we use SSR
    renderMode: RenderMode.Server,
  },
  {
    path: 'barcode/gs1',
    renderMode: RenderMode.Server,
  },
  {
    path: 'admin/stats',
    renderMode: RenderMode.Client,
  },
  {
    path: '**', // All other routes will be rendered on the client
    renderMode: RenderMode.Client,
  },
];
