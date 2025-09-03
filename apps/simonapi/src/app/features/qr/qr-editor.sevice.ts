import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GenerateRequest, QrPreset } from './models';
import { firstValueFrom, Observable } from 'rxjs';


const API = (window as any).env?.API_BASE_URL || window.origin + '/api';


@Injectable({ providedIn: 'root' })
export class QrService {
  private http = inject(HttpClient);


  generateSvg(req: GenerateRequest): Promise<string> {
    const body = { ...req, format: 'svg' };
    return firstValueFrom(this.http.post(`${API}/qr`, body, { responseType: 'text' }));
  }


  download(req: GenerateRequest & { format: 'png' | 'svg' }): Promise<void> {
    const body = { ...req };
    return firstValueFrom(this.http.post(`${API}/qr?download=1`, body, { responseType: 'blob' }))
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
    return this.http.post(`${API}/qr`, body, { responseType: 'blob' });
  }

  // Presets
  listPresets(): Promise<QrPreset[]> {
    return firstValueFrom(this.http.get<QrPreset[]>(`${API}/qr/presets`));
  }
  createPreset(p: Omit<QrPreset, 'id' | 'createdAt' | 'updatedAt'>): Promise<QrPreset> {
    return firstValueFrom(this.http.post<QrPreset>(`${API}/qr/presets`, p));
  }
  deletePreset(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API}/qr/presets/${id}`));
  }
}