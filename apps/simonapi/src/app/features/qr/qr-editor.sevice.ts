import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GenerateRequest, QrPreset } from './models';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../../environments/environments';
import { isPlatformBrowser } from '@angular/common';


@Injectable({ providedIn: 'root' })
export class QrService {
  private http = inject(HttpClient);
  private API;
  private platformId = inject(PLATFORM_ID);
  isBrowser = false;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.API = (environment.API_BASE_URL || window.origin) + '/api';
  }

  generateSvg(req: GenerateRequest): Promise<string> {
    const body = { ...req, format: 'svg' };
    return firstValueFrom(this.http.post(`${this.API}/qr`, body, { responseType: 'text' }));
  }


  download(req: GenerateRequest & { format: 'png' | 'svg' }): Promise<void> {
    const body = { ...req };
    return firstValueFrom(this.http.post(`${this.API}/qr?download=1`, body, { responseType: 'blob' }))
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-${req.type}.${req.format}`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  preview$(req: GenerateRequest): Observable<Blob> {
    const body = { ...req, format: 'png' }; // PNG für Vorschau
    body.size = 256;
    return this.http.post(`${this.API}/qr`, body, { responseType: 'blob' });
  }

  // Presets
  listPresets(): Promise<QrPreset[]> {
    return firstValueFrom(this.http.get<QrPreset[]>(`${this.API}/qr/presets`));
  }
  createPreset(p: Omit<QrPreset, 'id' | 'createdAt' | 'updatedAt'>): Promise<QrPreset> {
    return firstValueFrom(this.http.post<QrPreset>(`${this.API}/qr/presets`, p));
  }
  deletePreset(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.API}/qr/presets/${id}`));
  }
}