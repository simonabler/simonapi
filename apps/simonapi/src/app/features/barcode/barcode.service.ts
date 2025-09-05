import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../../environments/environments';
import { BarcodeRequest, Gs1Request } from './models';

const API = (environment.API_BASE_URL || window.origin) + '/api';

@Injectable({ providedIn: 'root' })
export class BarcodeService {
  private http = inject(HttpClient);

  private buildParams(req: BarcodeRequest): HttpParams {
    let p = new HttpParams().set('type', req.type).set('text', req.text);
    if (req.includetext) p = p.set('includetext', String(req.includetext));
    if (req.scale) p = p.set('scale', String(req.scale));
    if (req.height) p = p.set('height', String(req.height));
    return p;
  }

  preview$(req: BarcodeRequest): Observable<Blob> {
    const params = this.buildParams(req);
    return this.http.get(`${API}/barcode/png`, { params, responseType: 'blob' });
  }

  async download(req: BarcodeRequest, format: 'png' | 'svg'): Promise<void> {
    const params = this.buildParams(req);
    if (format === 'png') {
      const blob = await firstValueFrom(this.http.get(`${API}/barcode/png`, { params, responseType: 'blob' }));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `barcode-${req.type}.png`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    // SVG as text → blob for download
    const svgText = await firstValueFrom(this.http.get(`${API}/barcode/svg`, { params, responseType: 'text' }));
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barcode-${req.type}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // GS1
  previewGs1$(req: Gs1Request): Observable<Blob> {
    const body = { ...req};
    return this.http.post(`${API}/barcode/gs1/png`, body, { responseType: 'blob' });
  }

  async downloadGs1(req: Gs1Request, format: 'png' | 'svg'): Promise<void> {
    const body = { ...req, format } as const;
    if (format === 'png') {
      const blob = await firstValueFrom(this.http.post(`${API}/barcode/gs1/render`, body, { responseType: 'blob' }));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `gs1-${req.symbology}.png`; a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const svgText = await firstValueFrom(this.http.post(`${API}/barcode/gs1/render`, body, { responseType: 'text' }));
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `gs1-${req.symbology}.svg`; a.click();
    URL.revokeObjectURL(url);
  }
}
