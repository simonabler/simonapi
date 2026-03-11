import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';
import { isPlatformBrowser } from '@angular/common';

export interface RouteStats {
  route: string;
  count: number;
  methods: Record<string, number>;
  statuses: Record<string, number>;
  sumMs: number;
  minMs: number;
  maxMs: number;
  lastCallIso?: string;
  avgMs: number;
}

export interface MetricsSnapshot {
  startedAtIso: string;
  totalCount: number;
  byRoute: RouteStats[];
  daily: Record<string, number>;
}

export interface BlockEntryView {
  ip: string;
  until: number;
  reason: string;
  strikes: number;
  remainingMs: number;
  meta?: Record<string, any>;
}

export interface SecuritySnapshot {
  blocked: BlockEntryView[];
}

const STORAGE_KEY = 'admin_api_key';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly API: string;
  isBrowser = false;

  /** Currently configured admin API key — persisted in sessionStorage. */
  readonly apiKey = signal<string>('');

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    const origin = this.isBrowser ? window.origin : '';
    this.API = (environment.API_BASE_URL || origin) + '/api';

    if (this.isBrowser) {
      const stored = sessionStorage.getItem(STORAGE_KEY) ?? '';
      this.apiKey.set(stored);
    }
  }

  setApiKey(key: string): void {
    this.apiKey.set(key.trim());
    if (this.isBrowser) {
      if (key.trim()) {
        sessionStorage.setItem(STORAGE_KEY, key.trim());
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  private headers(): { headers: HttpHeaders } {
    return {
      headers: new HttpHeaders({ 'x-api-key': this.apiKey() }),
    };
  }

  getStats(): Observable<MetricsSnapshot> {
    return this.http.get<MetricsSnapshot>(`${this.API}/admin/stats`, this.headers());
  }

  getSecurity(): Observable<SecuritySnapshot> {
    return this.http.get<SecuritySnapshot>(`${this.API}/admin/stats/security`, this.headers());
  }

  unban(ip: string): Observable<void> {
    const params = new HttpParams({ fromObject: { ip } });
    return this.http.get<void>(`${this.API}/admin/stats/security/unban`, {
      ...this.headers(),
      params,
    });
  }
}
