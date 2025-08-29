import { Route } from '@angular/router';
import {  QrEditorComponent } from './features/qr/qr-editor.component';
import { HomeComponent } from './features/home/home.component';

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
];
