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
    path: 'barcode/gs1',
    loadComponent: () => import('./features/barcode/gs1-page.component').then(c => c.Gs1PageComponent),
    title: 'GS1 API — Barcode & Digital Link',
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
    loadComponent: () => import('./features/stats/stats-dashboard.component').then(m => m.StatsDashboardComponent),
    title: 'API Stats',
  },
  {
    path: 'crypto',
    loadComponent: () => import('./features/crypto/crypto-page.component').then(c => c.CryptoPageComponent),
    title: 'Crypto API — TOTP / Hash / JWT',
  },
  {
    path: 'signpack',
    loadComponent: () => import('./features/signpack/signpack-upload.component').then(c => c.SignpackUploadComponent),
    title: 'Signpack — Secure File Signing',
  },
  {
    path: 'signpack/sign/:id',
    loadComponent: () => import('./features/signpack/signpack-sign.component').then(c => c.SignpackSignComponent),
    title: 'Sign Document — Signpack',
  },
  {
    path: 'impressum',
    loadComponent: () => import('./features/legal/impressum.component').then(c => c.ImpressumComponent),
    title: 'Legal Notice',
  },
];


