import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environments';
import { StatsService } from './stats.service';

export type ApiKeyTier = 'free' | 'pro' | 'industrial';

export interface ApiKeyRecord {
  id: string;
  label: string;
  prefix: string;
  tier: ApiKeyTier;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyResult {
  message: string;
  rawKey: string;
  id: string;
  tier: ApiKeyTier;
  label: string;
}

export interface CreateApiKeyDto {
  label: string;
  tier: ApiKeyTier;
  expiresAt?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiKeysService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly statsService = inject(StatsService);

  private readonly API: string;

  constructor() {
    const isBrowser = isPlatformBrowser(this.platformId);
    const origin = isBrowser ? window.origin : '';
    this.API = (environment.API_BASE_URL || origin) + '/api';
  }

  private headers(): { headers: HttpHeaders } {
    return { headers: new HttpHeaders({ 'x-api-key': this.statsService.apiKey() }) };
  }

  list(): Observable<ApiKeyRecord[]> {
    return this.http.get<ApiKeyRecord[]>(`${this.API}/admin/api-keys`, this.headers());
  }

  create(dto: CreateApiKeyDto): Observable<CreateApiKeyResult> {
    return this.http.post<CreateApiKeyResult>(`${this.API}/admin/api-keys`, dto, this.headers());
  }

  revoke(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/admin/api-keys/${id}`, this.headers());
  }
}
