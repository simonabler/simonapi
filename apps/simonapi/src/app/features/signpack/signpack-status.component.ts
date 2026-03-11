import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SignpackService } from './signpack.service';
import { SignpackMeta, SignpackStatus } from './signpack.models';

@Component({
  standalone: true,
  selector: 'app-signpack-status',
  imports: [CommonModule],
  styles: [`
    :host { display: block; }

    .sp-label {
      font-size: .7rem;
      font-weight: 700;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: var(--brand);
      margin-bottom: .5rem;
    }
    .sp-title {
      font-size: clamp(1.6rem, 4vw, 2.4rem);
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -.03em;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: .4rem;
      padding: .3rem .75rem;
      border-radius: 99px;
      font-size: .75rem;
      font-weight: 700;
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    .badge-uploaded { background: color-mix(in oklab,#f59e0b,transparent 85%); color: #92400e; }
    .badge-signed   { background: color-mix(in oklab,#22c55e,transparent 85%); color: #14532d; }
    .badge-expired  { background: color-mix(in oklab,#ef4444,transparent 85%); color: #7f1d1d; }
    .badge-deleted  { background: color-mix(in oklab,#94a3b8,transparent 85%); color: #334155; }

    .card {
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius-lg);
      padding: 1.75rem;
      background: var(--surface);
    }
    .section-title {
      font-weight: 700;
      font-size: .82rem;
      letter-spacing: .05em;
      text-transform: uppercase;
      color: var(--bs-secondary-color);
      margin-bottom: .75rem;
    }

    .link-box {
      display: flex;
      align-items: center;
      gap: .5rem;
      padding: .65rem 1rem;
      border: 1.5px solid var(--border, #e2e8f0);
      border-radius: var(--radius-sm);
      background: var(--bs-body-bg);
      font-size: .82rem;
      font-family: monospace;
      word-break: break-all;
    }
    .link-box span { flex: 1; }
    .copy-btn {
      flex-shrink: 0;
      padding: .3rem .65rem;
      font-size: .75rem;
      border-radius: var(--radius-sm);
    }

    .poll-row {
      display: flex;
      align-items: center;
      gap: .75rem;
      font-size: .9rem;
    }
    .poll-spinner {
      width: 16px; height: 16px;
      border: 2.5px solid var(--border);
      border-top-color: var(--brand);
      border-radius: 50%;
      animation: spin .7s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .signed-box {
      padding: 1.25rem 1.5rem;
      border-radius: var(--radius);
      border: 2px solid #22c55e;
      background: color-mix(in oklab,#22c55e,transparent 90%);
    }

    .error-box {
      padding: 1.5rem;
      border-radius: var(--radius-lg);
      border: 2px solid #ef4444;
      background: color-mix(in oklab,#ef4444,transparent 92%);
    }

    .skeleton {
      background: linear-gradient(90deg, var(--border) 25%, color-mix(in oklab,var(--border),white 30%) 50%, var(--border) 75%);
      background-size: 200% 100%;
      border-radius: .25rem;
      animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer { to { background-position: -200% 0; } }

    .bookmark-hint {
      display: inline-flex;
      align-items: center;
      gap: .4rem;
      padding: .35rem .8rem;
      border-radius: 99px;
      font-size: .78rem;
      background: color-mix(in oklab, var(--brand), transparent 88%);
      color: var(--brand);
      font-weight: 600;
    }
  `],
  template: `
<div class="container py-4">

  <!-- Loading -->
  @if (loadState() === 'loading') {
    <div class="py-4">
      <div class="skeleton mb-3" style="width:80px;height:.6rem"></div>
      <div class="skeleton mb-2" style="width:60%;height:1.8rem"></div>
      <div class="skeleton" style="width:40%;height:1rem"></div>
    </div>
  }

  <!-- Error -->
  @if (loadState() === 'error') {
    <div class="error-box mt-5">
      <h2 class="h5 mb-1">⚠️ Could not load Signpack</h2>
      <p class="text-body-secondary small mb-0">{{ errorMsg() }}</p>
    </div>
  }

  <!-- Loaded -->
  @if (loadState() === 'ok') {
    <div class="py-3 mb-4">
      <p class="sp-label">Signpack — sender view</p>
      <h1 class="sp-title mb-2">Waiting for signature</h1>
      <span class="bookmark-hint">🔖 Bookmark this page to come back later</span>
    </div>

    <div class="row g-4">
      <!-- Left column -->
      <div class="col-12 col-lg-7">

        <!-- Signed! -->
        @if (status() === 'SIGNED') {
          <div class="signed-box mb-4">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span style="font-size:1.3rem">✅</span>
              <strong>Document signed!</strong>
            </div>
            <p class="small text-body-secondary mb-3">
              Download the bundle ZIP containing the original and the signed file.
            </p>
            <a
              class="btn btn-primary d-inline-flex align-items-center gap-2"
              [href]="bundleHref"
              download
            >
              <span>📦</span> Download Bundle ZIP
            </a>
          </div>
        }

        <!-- Polling -->
        @if (status() === 'UPLOADED') {
          <div class="card mb-4">
            <div class="poll-row mb-1">
              <div class="poll-spinner"></div>
              <strong>Waiting for the signed version…</strong>
            </div>
            <div class="text-body-secondary small ps-4">
              Polling every 5 seconds. You can safely close this tab and return via the URL.
            </div>
          </div>
        }

        <!-- Expired / Deleted -->
        @if (status() === 'EXPIRED' || status() === 'DELETED') {
          <div class="error-box mb-4">
            <strong>{{ status() === 'EXPIRED' ? '⏰ Expired' : '🗑 Deleted' }}</strong>
            <p class="small text-body-secondary mb-0 mt-1">This signpack is no longer available.</p>
          </div>
        }

        <!-- Signing link -->
        <div class="card">
          <p class="section-title">Signing link — share with signer</p>
          <div class="link-box mb-2">
            <span>{{ signLink }}</span>
            <button class="btn btn-outline-secondary copy-btn" (click)="copy(signLink)">
              {{ copied() ? '✓ Copied' : 'Copy' }}
            </button>
          </div>
          <p class="text-body-secondary small mb-0">
            Anyone with this link can upload the signed version.
          </p>
        </div>
      </div>

      <!-- Right column -->
      <div class="col-12 col-lg-5">
        <div class="card">
          <p class="section-title">Status</p>
          <div class="mb-3">
            <span class="status-badge"
              [class.badge-uploaded]="status() === 'UPLOADED'"
              [class.badge-signed]="status() === 'SIGNED'"
              [class.badge-expired]="status() === 'EXPIRED'"
              [class.badge-deleted]="status() === 'DELETED'"
            >{{ status() }}</span>
          </div>

          @if (meta()?.expiresAt) {
            <div class="text-body-secondary small mb-1">
              <span class="fw-semibold">Expires:</span>
              {{ meta()!.expiresAt | date:'medium' }}
            </div>
          } @else {
            <div class="text-body-secondary small mb-1">No expiry set</div>
          }

          <div class="text-body-secondary small">
            <span class="fw-semibold">ID:</span> <code>{{ id }}</code>
          </div>
        </div>
      </div>
    </div>
  }

</div>
  `,
})
export class SignpackStatusComponent implements OnInit, OnDestroy {
  private readonly svc = inject(SignpackService);
  private readonly route = inject(ActivatedRoute);

  readonly loadState = signal<'loading' | 'ok' | 'error'>('loading');
  readonly meta = signal<SignpackMeta | null>(null);
  readonly status = signal<SignpackStatus>('UPLOADED');
  readonly errorMsg = signal<string | null>(null);
  readonly copied = signal(false);

  id = '';
  token = '';
  signLink = '';
  bundleHref = '';

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.id    = this.route.snapshot.paramMap.get('id') ?? '';
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!this.id || !this.token) {
      this.errorMsg.set('Missing signpack ID or token in URL.');
      this.loadState.set('error');
      return;
    }

    this.signLink   = `${window.origin}/signpack/sign/${this.id}?token=${this.token}`;
    this.bundleHref = this.svc.bundleUrl(this.id, this.token);

    this.fetchMeta();
  }

  private fetchMeta(): void {
    this.svc.meta(this.id, this.token).subscribe({
      next: (m) => {
        this.meta.set(m);
        this.status.set(m.status);
        this.loadState.set('ok');
        if (m.status === 'UPLOADED') {
          this.startPolling();
        }
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message ?? 'Signpack not found or link is invalid.');
        this.loadState.set('error');
      },
    });
  }

  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      this.svc.meta(this.id, this.token).subscribe({
        next: (m) => {
          this.meta.set(m);
          this.status.set(m.status);
          if (m.status !== 'UPLOADED') this.stopPolling();
        },
      });
    }, 5000);
  }

  private stopPolling(): void {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
  }

  async copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch { /* ignore */ }
  }

  ngOnDestroy(): void { this.stopPolling(); }
}
