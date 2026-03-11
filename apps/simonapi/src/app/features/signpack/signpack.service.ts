import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';
import { SignpackCreateResult, SignpackMeta, SignpackSignResult } from './signpack.models';

@Injectable({ providedIn: 'root' })
export class SignpackService {
  private readonly API: string;

  constructor(private readonly http: HttpClient) {
    this.API = (environment.API_BASE_URL || (typeof window !== 'undefined' ? window.origin : '')) + '/api';
  }

  /** Upload the original file and create a new signpack. */
  create(file: File, expiresInMinutes?: number): Observable<SignpackCreateResult> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    const params: Record<string, string> = {};
    if (expiresInMinutes) params['expiresInMinutes'] = String(expiresInMinutes);
    return this.http.post<SignpackCreateResult>(`${this.API}/signpacks`, fd, { params });
  }

  /** Poll status of an existing signpack. */
  meta(id: string, token: string): Observable<SignpackMeta> {
    return this.http.get<SignpackMeta>(`${this.API}/signpacks/${id}/meta`, {
      params: { token },
    });
  }

  /** Upload the signed version of the file. */
  sign(id: string, token: string, file: File): Observable<SignpackSignResult> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http.post<SignpackSignResult>(`${this.API}/signpacks/${id}/sign`, fd, {
      params: { token },
    });
  }

  /** Returns the URL for bundle.zip download (used as href). */
  bundleUrl(id: string, token: string, destroy = false): string {
    const d = destroy ? '&destroy=true' : '';
    return `${this.API}/signpacks/${id}/bundle.zip?token=${token}${d}`;
  }

  /** Returns the URL for the original file download. */
  originalUrl(id: string, token: string): string {
    return `${this.API}/signpacks/${id}/original?token=${token}`;
  }

  /** Destroy a signpack (soft-delete). */
  destroy(id: string, token: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/signpacks/${id}`, {
      params: { token },
    });
  }
}
