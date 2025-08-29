import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const API = (window as any).env?.API_BASE_URL || 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class DevUtilsService {
  private http = inject(HttpClient);

  echo(): Promise<any> {
    return firstValueFrom(this.http.get(`${API}/utils/echo`));
  }

  generateId(type: 'uuid' | 'ulid' = 'ulid'): Promise<any> {
    return firstValueFrom(this.http.get(`${API}/utils/id`, { params: { type } }));
  }

  slugify(text: string): Promise<any> {
    return firstValueFrom(this.http.post(`${API}/utils/slugify`, { text }));
  }

  hash(data: string, algo: 'md5' | 'sha256' | 'bcrypt' = 'sha256'): Promise<any> {
    return firstValueFrom(this.http.post(`${API}/utils/hash`, { data }, { params: { algo } }));
  }

  md2html(markdown: string): Promise<any> {
    return firstValueFrom(this.http.post(`${API}/utils/md2html`, { markdown }, { responseType: 'text' as any }));
  }
}

