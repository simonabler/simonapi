import { Injectable, signal } from '@angular/core';

export type ToastType = 'error' | 'warning' | 'success' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  durationMs: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _counter = 0;
  readonly toasts = signal<Toast[]>([]);

  show(type: ToastType, title: string, message?: string, durationMs = 5000): void {
    const id = ++this._counter;
    this.toasts.update(ts => [...ts, { id, type, title, message, durationMs }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  dismiss(id: number): void {
    this.toasts.update(ts => ts.filter(t => t.id !== id));
  }

  rateLimitExceeded(retryAfter?: number): void {
    const retry = retryAfter ? ` Try again in ${retryAfter}s.` : '';
    this.show('warning', 'Rate limit exceeded', `Too many requests.${retry}`, 7000);
  }
}
