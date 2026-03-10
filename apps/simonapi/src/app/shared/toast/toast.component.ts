import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from './toast.service';

@Component({
  standalone: true,
  selector: 'app-toast-outlet',
  imports: [CommonModule],
  styles: [`
    .toast-stack {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: .6rem;
      max-width: min(24rem, calc(100vw - 2rem));
      pointer-events: none;
    }
    .toast-item {
      pointer-events: all;
      display: flex;
      align-items: flex-start;
      gap: .75rem;
      padding: .85rem 1rem;
      border-radius: .5rem;
      border-left: 4px solid;
      background: var(--bs-body-bg, #fff);
      box-shadow: 0 4px 20px rgba(0,0,0,.15);
      animation: toast-in .2s ease;
    }
    @keyframes toast-in {
      from { opacity: 0; transform: translateX(2rem); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .toast-item.warning { border-color: #f59e0b; }
    .toast-item.error   { border-color: #ef4444; }
    .toast-item.success { border-color: #22c55e; }
    .toast-item.info    { border-color: var(--brand, #22d3ee); }

    .toast-icon { font-size: 1.1rem; flex-shrink: 0; margin-top: .05rem; }
    .toast-title { font-weight: 600; font-size: .9rem; line-height: 1.3; }
    .toast-msg   { font-size: .82rem; opacity: .8; margin-top: .2rem; }
    .toast-close {
      margin-left: auto;
      background: none;
      border: none;
      cursor: pointer;
      opacity: .5;
      font-size: 1rem;
      line-height: 1;
      padding: 0 0 0 .5rem;
      flex-shrink: 0;
    }
    .toast-close:hover { opacity: 1; }
  `],
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="false">
      @for (t of svc.toasts(); track t.id) {
        <div class="toast-item {{ t.type }}" role="alert">
          <span class="toast-icon">{{ icon(t) }}</span>
          <div class="flex-grow-1">
            <div class="toast-title">{{ t.title }}</div>
            @if (t.message) {
              <div class="toast-msg">{{ t.message }}</div>
            }
          </div>
          <button class="toast-close" (click)="svc.dismiss(t.id)" aria-label="Schließen">✕</button>
        </div>
      }
    </div>
  `,
})
export class ToastOutletComponent {
  readonly svc = inject(ToastService);

  icon(t: Toast): string {
    return { warning: '⚠️', error: '❌', success: '✅', info: 'ℹ️' }[t.type];
  }
}
