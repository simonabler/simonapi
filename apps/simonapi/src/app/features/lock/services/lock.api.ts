import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../environments/environments';
import {
  AccessEvent,
  AccessLink,
  CreateAccessLinkDto,
  LockEntity,
  LockGroup,
  PublicLockItem,
  PublicLocksResponse,
} from '../models/lock.models';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class LockApiService {
  private http = inject(HttpClient);
  private API;
  private platformId = inject(PLATFORM_ID);
  isBrowser = false;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.API = (environment.API_BASE_URL || window.origin) + '/api';
  }
  // Admin
  getLocks$(): Observable<LockEntity[]> {
    return this.http.get<LockEntity[]>(`${this.API}/admin/locks`).pipe(catchError(this.handleError('getLocks')));
  }
  getLock$(id: string): Observable<LockEntity> {
    return this.http.get<LockEntity>(`${this.API}/admin/locks/${encodeURIComponent(id)}`).pipe(catchError(this.handleError('getLock')));
  }
  createLock$(body: Partial<LockEntity>): Observable<LockEntity> {
    return this.http.post<LockEntity>(`${this.API}/admin/locks`, body).pipe(catchError(this.handleError('createLock')));
  }
  updateLock$(id: string, body: Partial<LockEntity>): Observable<LockEntity> {
    return this.http.patch<LockEntity>(`${this.API}/admin/locks/${encodeURIComponent(id)}`, body).pipe(catchError(this.handleError('updateLock')));
  }

  getGroups$(): Observable<LockGroup[]> {
    return this.http.get<LockGroup[]>(`${this.API}/admin/lock-groups`).pipe(catchError(this.handleError('getGroups')));
  }
  getGroup$(id: string): Observable<LockGroup> {
    return this.http.get<LockGroup>(`${this.API}/admin/lock-groups/${encodeURIComponent(id)}`).pipe(catchError(this.handleError('getGroup')));
    }
  createGroup$(body: Partial<LockGroup>): Observable<LockGroup> {
    return this.http.post<LockGroup>(`${this.API}/admin/lock-groups`, body).pipe(catchError(this.handleError('createGroup')));
  }
  updateGroup$(id: string, body: Partial<LockGroup>): Observable<LockGroup> {
    return this.http.patch<LockGroup>(`${this.API}/admin/lock-groups/${encodeURIComponent(id)}`, body).pipe(catchError(this.handleError('updateGroup')));
  }
  addGroupMembers$(groupId: string, lockIds: string[]): Observable<any> {
    return this.http
      .post(`${this.API}/admin/lock-groups/${encodeURIComponent(groupId)}/members`, { lockIds })
      .pipe(catchError(this.handleError('addGroupMembers')));
  }
  removeGroupMembers$(groupId: string, lockIds: string[]): Observable<any> {
    return this.http
      .post(`${this.API}/admin/lock-groups/${encodeURIComponent(groupId)}/members/remove`, { lockIds })
      .pipe(catchError(this.handleError('removeGroupMembers')));
  }

  getAccessLinks$(): Observable<AccessLink[]> {
    return this.http.get<AccessLink[]>(`${this.API}/admin/access-links`).pipe(catchError(this.handleError('getAccessLinks')));
  }
  createAccessLink$(dto: CreateAccessLinkDto): Observable<{ shareUrl: string; pin?: string }> {
    return this.http
      .post<{ shareUrl: string; pin?: string }>(`${this.API}/admin/access-links`, dto)
      .pipe(catchError(this.handleError('createAccessLink')));
  }
  updateAccessLink$(id: string, patch: Partial<AccessLink>): Observable<AccessLink> {
    return this.http
      .patch<AccessLink>(`${this.API}/admin/access-links/${encodeURIComponent(id)}`, patch)
      .pipe(catchError(this.handleError('updateAccessLink')));
  }

  getEvents$(query: {
    from?: string;
    to?: string;
    lockId?: string;
    linkId?: string;
    result?: 'SUCCESS' | 'FAILED';
  }): Observable<AccessEvent[]> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v != null && v !== '') params = params.set(k, String(v));
    }
    return this.http.get<AccessEvent[]>(`${this.API}/admin/events`, { params }).pipe(catchError(this.handleError('getEvents')));
  }

  // Public
  getPublicLocks$(slug: string, token: string): Observable<{ locks: PublicLockItem[]; validTo?: string; validFrom?: string }>
  {
    const params = new HttpParams().set('slug', slug).set('t', token);
    return this.http.get<PublicLocksResponse>(`${this.API}/lock/locks`, { params }).pipe(catchError(this.handleError('getPublicLocks')));
  }

  openPublic$(slug: string, token: string, lockId: string, swipeNonce: string, pin?: string): Observable<{ ok: boolean; message?: string }>
  {
    const body: any = { slug, token, lockId, swipeNonce };
    if (pin) body.pin = pin;
    return this.http.post<{ ok: boolean; message?: string }>(`${this.API}/lock/open`, body).pipe(catchError(this.handleError('openPublic')));
  }

  // Centralized error handling to keep UI simple
  private handleError(op: string) {
    return (err: any) => {
      const message = err?.error?.message || err?.message || `${op} failed`;
      return throwError(() => new Error(message));
    };
  }
}
