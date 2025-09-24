import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';
import { isPlatformBrowser } from '@angular/common';

export type WatermarkMode = 'logo' | 'text';
export type WatermarkAnchor =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'bottom-center'
  | 'center-left'
  | 'center-right';

export interface WatermarkOptions {
  mode: WatermarkMode;
  // Absolute XY overrides anchor when provided
  position?: string; // format: "x,y" in pixels relative to image top-left
  // Anchor (backend enum) used when no absolute position is provided
  anchor?: WatermarkAnchor;
  opacity: number; // 0..1
  scale: number; // e.g. 1 = 100%
  margin: number; // px
  rotate: number; // degrees
  tile: boolean;
  gap: number; // px, used when tile=true
  text?: string;
  fontSize?: number; // px
  fontFamily?: string;
  color?: string; // hex or rgba
  strokeColor?: string; // hex or rgba
  strokeWidth?: number; // px
  download?: boolean; // when true, backend may hint filename, etc.
}

@Injectable({ providedIn: 'root' })
export class WatermarkService {
  
  private http = inject(HttpClient);
  private API;
  private platformId = inject(PLATFORM_ID);
  isBrowser = false;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.API = (environment.API_BASE_URL || window.origin) + '/api';
  }
  apply(file: File, opts: WatermarkOptions, logo?: File): Observable<Blob> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    if (logo) {
      fd.append('logo', logo, logo.name);
    }

  // Append each option as form fields (multipart/form-data)
  fd.append('mode', String(opts.mode));
  if (opts.position != null && opts.position !== '') {
    fd.append('position', String(opts.position));
  }
  if (opts.anchor != null) {
    fd.append('anchor', String(opts.anchor));
  }
  fd.append('opacity', String(1));
  fd.append('scale', String(opts.scale ?? 1));
  fd.append('margin', String(opts.margin ?? 0));
  fd.append('rotate', String(opts.rotate ?? 0));
  fd.append('tile', String(!!opts.tile));
    fd.append('gap', String(opts.gap ?? 0));

    if (opts.text != null) fd.append('text', String(opts.text));
    if (opts.fontSize != null) fd.append('fontSize', String(opts.fontSize));
    if (opts.fontFamily != null) fd.append('fontFamily', String(opts.fontFamily));
    if (opts.color != null) fd.append('color', String(opts.color));
    if (opts.strokeColor != null) fd.append('strokeColor', String(opts.strokeColor));
    if (opts.strokeWidth != null) fd.append('strokeWidth', String(opts.strokeWidth));
    if (opts.download != null) fd.append('download', String(!!opts.download));

    return this.http.post(`${this.API}/watermark/apply`, fd, { responseType: 'blob' });
  }
}
