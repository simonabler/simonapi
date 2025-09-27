import { Route } from '@angular/router';
import {  QrEditorComponent } from './features/qr/qr-editor.component';
import { BarcodeEditorComponent } from './features/barcode/barcode-editor.component';
import { HomeComponent } from './features/home/home.component';
import { DevUtilsComponent } from './features/dev-utils/dev-utils.component';

export const appRoutes: Route[] = [
  {
    path: '',
    component: HomeComponent,
    title: 'SimonAPI - Free API'
  },
  {
    path: 'qr',
    component: QrEditorComponent,
    title: 'QR Code Generator — Free PNG/SVG',
  },
  {
    path: 'barcode',
    component: BarcodeEditorComponent,
    title: 'Barcode Generator'
  },
  {
    path: 'dev-utils',
    component: DevUtilsComponent,
    title: 'Dev Utilities'
  },
  {
    path: 'tools/watermark',
    loadComponent: () => import('./features/watermark/watermark-uploader/watermark-uploader.component').then(c => c.WatermarkUploaderComponent),
  },
  {
    path: 'admin/lock',
    loadChildren: () => import('./features/lock/lock.routes').then(m => m.LOCK_ADMIN_ROUTES),
  },
  {
    path: 'lock',
    loadChildren: () => import('./features/lock/lock.routes').then(m => m.LOCK_PUBLIC_ROUTES),
  },
  {
    path: 'admin/stats',
    loadChildren: () => import('./features/stats/stats.module').then(m => m.StatsModule),
    title: 'API Stats',
  },
  {
    path: 'impressum',
    loadComponent: () => import('./features/legal/impressum.component').then(c => c.ImpressumComponent),
    title: 'Impressum',
  },
];


