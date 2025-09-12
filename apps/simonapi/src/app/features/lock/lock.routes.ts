import { Route } from '@angular/router';
import { AdminLockComponent } from './admin/admin-lock.component';
import { PublicLockComponent } from './public/public-lock.component';

// Export separate route arrays to enable flexible parent paths in app router
export const LOCK_ADMIN_ROUTES: Route[] = [
  { path: '', component: AdminLockComponent, title: 'Locks Admin' },
];

export const LOCK_PUBLIC_ROUTES: Route[] = [
  { path: ':slug', component: PublicLockComponent, title: 'Lock Access' },
];

// For compatibility with the requested name; exporting superset is harmless but unused
export const LOCK_ROUTES: Route[] = [
  ...LOCK_ADMIN_ROUTES,
  ...LOCK_PUBLIC_ROUTES,
];

