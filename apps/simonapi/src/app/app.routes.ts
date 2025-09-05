import { Route } from '@angular/router';
import {  QrEditorComponent } from './features/qr/qr-editor.component';
import { BarcodeEditorComponent } from './features/barcode/barcode-editor.component';
import { HomeComponent } from './features/home/home.component';
import { DevUtilsComponent } from './features/dev-utils/dev-utils.component';

export const appRoutes: Route[] = [
  {
    path: '',
    component: HomeComponent,
    title: 'Home'
  },
  {
    path: 'qr',
    component: QrEditorComponent,
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
];
