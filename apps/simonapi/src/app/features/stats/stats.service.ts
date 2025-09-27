import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
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

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http= inject(HttpClient)
  private readonly platformId = inject(PLATFORM_ID);

  private readonly API: string;
  isBrowser = false;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    const origin = this.isBrowser ? window.origin : '';
    this.API = (environment.API_BASE_URL || origin) + '/api';
  }

  getStats(): Observable<MetricsSnapshot> {
    return this.http.get<MetricsSnapshot>(`${this.API}/_stats`);
  }

  getSecurity(): Observable<SecuritySnapshot> {
    return this.http.get<SecuritySnapshot>(`${this.API}/_stats/security`);
  }

  unban(ip: string): Observable<void> {
    const params = new HttpParams({ fromObject: { ip } });
    return this.http.get<void>(`${this.API}/_stats/security/unban`, { params });
  }
}
