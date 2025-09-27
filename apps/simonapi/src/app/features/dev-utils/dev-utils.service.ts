import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environments';
import { isPlatformBrowser } from '@angular/common';


@Injectable({ providedIn: 'root' })
export class DevUtilsService {
  private http = inject(HttpClient);
  private API;
  private platformId = inject(PLATFORM_ID);
  isBrowser = false;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.API = (environment.API_BASE_URL || window.origin) + '/api';
  }
  echo(): Promise<any> {
    return firstValueFrom(this.http.get(`${this.API}/utils/echo`));
  }

  generateId(type: 'uuid' | 'ulid' = 'ulid'): Promise<any> {
    return firstValueFrom(this.http.get(`${this.API}/utils/id`, { params: { type } }));
  }

  slugify(text: string): Promise<any> {
    return firstValueFrom(this.http.post(`${this.API}/utils/slugify`, { text }));
  }

  hash(data: string, algo: 'md5' | 'sha256' | 'bcrypt' = 'sha256'): Promise<any> {
    return firstValueFrom(this.http.post(`${this.API}/utils/hash`, { data }, { params: { algo } }));
  }

  md2html(markdown: string): Promise<any> {
    return firstValueFrom(this.http.post(`${this.API}/utils/md2html`, { markdown }, { responseType: 'text' as any }));
  }
}

