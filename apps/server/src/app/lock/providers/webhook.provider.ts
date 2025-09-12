import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { LockEntity, LockProvider, LockProviderType, OpenResult } from '../core/lock.types';

@Injectable()
export class WebhookProvider implements LockProvider {
  readonly type = LockProviderType.WEBHOOK;
  private cfg!: {
    url: string;
    method?: 'POST' | 'GET' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
    bodyTemplate?: any;
    timeoutMs?: number;
    hmacSecret?: string;
  };

  constructor(private readonly http: HttpService) {}

  configure(config: Record<string, any>) {
    this.cfg = {
      url: config.url,
      method: config.method ?? 'POST',
      headers: config.headers ?? {},
      bodyTemplate: config.bodyTemplate ?? {},
      timeoutMs: config.timeoutMs ?? 3000,
      hmacSecret: config.hmacSecret,
    };
  }

  async openLock(lock: LockEntity, opts: { traceId: string }): Promise<OpenResult> {
    const body = {
      ...this.cfg.bodyTemplate,
      lockId: lock.id,
      action: 'OPEN',
      traceId: opts.traceId,
      ts: new Date().toISOString(),
    };

    const headers = { ...(this.cfg.headers || {}) };

    if (this.cfg.hmacSecret) {
      const sig = crypto.createHmac('sha256', this.cfg.hmacSecret).update(JSON.stringify(body)).digest('hex');
      headers['X-Signature'] = sig;
    }

    try {
      const resp = await firstValueFrom(
        this.http.request({ url: this.cfg.url, method: this.cfg.method, data: body, headers, timeout: this.cfg.timeoutMs }),
      );
      return { ok: resp.status >= 200 && resp.status < 300, detail: resp.data };
    } catch (e: any) {
      return { ok: false, detail: e?.response?.data ?? e?.message };
    }
  }
}
