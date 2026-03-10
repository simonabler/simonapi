import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SignpackService } from './signpack.service';
import { SignpackCreateResult, SignpackStatus } from './signpack.models';

type Step = 'upload' | 'share' | 'status';

interface ExpiryOption { label: string; minutes: number }

const EXPIRY_OPTIONS: ExpiryOption[] = [
  { label: 'No expiry',   minutes: 0 },
  { label: '1 hour',      minutes: 60 },
  { label: '6 hours',     minutes: 360 },
  { label: '24 hours',    minutes: 1440 },
  { label: '3 days',      minutes: 4320 },
  { label: '7 days',      minutes: 10080 },
];

@Component({
  standalone: true,
  selector: 'app-signpack-upload',
  imports: [CommonModule, FormsModule],
  styles: [`
    :host { display: block; }

    .sp-hero {
      padding: 3rem 0 2rem;
    }
    .sp-label {
      font-size: .7rem;
      font-weight: 700;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: var(--brand);
      margin-bottom: .5rem;
    }
    .sp-title {
      font-size: clamp(1.8rem, 4vw, 2.8rem);
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -.03em;
      margin-bottom: .75rem;
    }
    .sp-sub {
      color: var(--bs-secondary-color);
      max-width: 520px;
      line-height: 1.65;
    }

    /* Steps indicator */
    .steps {
      display: flex;
      align-items: center;
      gap: 0;
      margin-bottom: 2.5rem;
    }
    .step-item {
      display: flex;
      align-items: center;
      gap: .5rem;
      font-size: .82rem;
      font-weight: 600;
      color: var(--bs-secondary-color);
    }
    .step-item.active { color: var(--brand); }
    .step-item.done   { color: var(--bs-success); }
    .step-dot {
      width: 26px; height: 26px;
      border-radius: 50%;
      display: grid; place-items: center;
      font-size: .75rem; font-weight: 700;
      border: 2px solid currentColor;
      flex-shrink: 0;
    }
    .step-item.active .step-dot {
      background: var(--brand);
      border-color: var(--brand);
      color: #0f172a;
    }
    .step-item.done .step-dot {
      background: var(--bs-success);
      border-color: var(--bs-success);
      color: #fff;
    }
    .step-line {
      flex: 1; height: 2px;
      background: var(--border, #e2e8f0);
      margin: 0 .75rem;
      min-width: 2rem;
    }

    /* Drop zone */
    .drop-zone {
      border: 2px dashed var(--border, #e2e8f0);
      border-radius: var(--radius-lg);
      padding: 3rem 2rem;
      text-align: center;
      cursor: pointer;
      transition: border-color .2s, background .2s;
      background: var(--surface);
    }
    .drop-zone:hover, .drop-zone.drag-over {
      border-color: var(--brand);
      background: color-mix(in oklab, var(--brand), transparent 92%);
    }
    .drop-zone.has-file {
      border-style: solid;
      border-color: var(--brand);
      background: color-mix(in oklab, var(--brand), transparent 93%);
    }
    .drop-icon { font-size: 2.5rem; margin-bottom: .75rem; display: block; }
    .drop-hint { color: var(--bs-secondary-color); font-size: .9rem; margin-top: .4rem; }
    .file-name {
      font-weight: 700;
      font-size: 1rem;
      word-break: break-all;
    }
    .file-size {
      font-size: .8rem;
      color: var(--bs-secondary-color);
      margin-top: .2rem;
    }

    /* Expiry selector */
    .expiry-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
      gap: .5rem;
    }
    .expiry-btn {
      padding: .5rem .75rem;
      border: 1.5px solid var(--border, #e2e8f0);
      border-radius: var(--radius-sm);
      background: var(--surface);
      font-size: .82rem;
      cursor: pointer;
      transition: all .15s;
      text-align: center;
    }
    .expiry-btn:hover { border-color: var(--brand); color: var(--brand); }
    .expiry-btn.selected {
      border-color: var(--brand);
      background: color-mix(in oklab, var(--brand), transparent 88%);
      color: var(--brand);
      font-weight: 600;
    }

    /* Share card */
    .share-card {
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius-lg);
      padding: 1.75rem;
      background: var(--surface);
    }
    .share-card .status-badge {
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

    /* Status poll */
    .poll-status {
      display: flex;
      align-items: center;
      gap: .75rem;
      padding: 1rem 1.25rem;
      border-radius: var(--radius);
      border: 1px solid var(--border, #e2e8f0);
      background: var(--surface);
      font-size: .9rem;
    }
    .poll-spinner {
      width: 18px; height: 18px;
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

    .section-title {
      font-weight: 700;
      font-size: .85rem;
      letter-spacing: .04em;
      text-transform: uppercase;
      color: var(--bs-secondary-color);
      margin-bottom: .75rem;
    }
  `],
  template: `
<div class="container py-4">
  <!-- Hero -->
  <div class="sp-hero">
    <p class="sp-label">Signpack</p>
    <h1 class="sp-title">Secure document<br>hand-off &amp; signing</h1>
    <p class="sp-sub">
      Upload a file, share a one-time link, and receive the signed version —
      no account needed, token-protected.
    </p>
  </div>

  <!-- Steps -->
  <div class="steps">
    <div class="step-item" [class.active]="step() === 'upload'" [class.done]="step() !== 'upload'">
      <div class="step-dot">{{ step() !== 'upload' ? '✓' : '1' }}</div>
      <span>Upload</span>
    </div>
    <div class="step-line"></div>
    <div class="step-item" [class.active]="step() === 'share'" [class.done]="step() === 'status'">
      <div class="step-dot">{{ step() === 'status' ? '✓' : '2' }}</div>
      <span>Share link</span>
    </div>
    <div class="step-line"></div>
    <div class="step-item" [class.active]="step() === 'status'">
      <div class="step-dot">3</div>
      <span>Receive signed</span>
    </div>
  </div>

  <!-- ── Step 1: Upload ── -->
  @if (step() === 'upload') {
    <div class="row g-4">
      <div class="col-12 col-lg-7">
        <p class="section-title">Select file</p>

        <!-- Drop zone -->
        <div
          class="drop-zone"
          [class.has-file]="!!selectedFile()"
          [class.drag-over]="isDragOver"
          (click)="fileInput.click()"
          (dragover)="$event.preventDefault(); isDragOver = true"
          (dragleave)="isDragOver = false"
          (drop)="onDrop($event)"
        >
          @if (selectedFile(); as f) {
            <span class="drop-icon">📄</span>
            <div class="file-name">{{ f.name }}</div>
            <div class="file-size">{{ formatBytes(f.size) }}</div>
            <div class="drop-hint mt-2">Click to replace</div>
          } @else {
            <span class="drop-icon">⬆️</span>
            <div class="fw-semibold">Drop file here or click to browse</div>
            <div class="drop-hint">Max 25 MB · any file type</div>
          }
        </div>
        <input #fileInput type="file" hidden (change)="onFileChange($event)">
      </div>

      <div class="col-12 col-lg-5">
        <p class="section-title">Expiry</p>
        <div class="expiry-grid mb-4">
          @for (opt of expiryOptions; track opt.minutes) {
            <button
              class="expiry-btn"
              [class.selected]="selectedExpiry === opt.minutes"
              (click)="selectedExpiry = opt.minutes"
            >{{ opt.label }}</button>
          }
        </div>

        @if (uploadError()) {
          <div class="alert alert-danger py-2 small mb-3">{{ uploadError() }}</div>
        }

        <button
          class="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
          [disabled]="!selectedFile() || uploading()"
          (click)="upload()"
        >
          @if (uploading()) {
            <span class="poll-spinner" style="border-top-color:#0f172a"></span>
            Uploading…
          } @else {
            <span>🔒</span> Create Signpack
          }
        </button>
      </div>
    </div>
  }

  <!-- ── Step 2: Share link ── -->
  @if (step() === 'share' && result()) {
    <div class="share-card">
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
        <div>
          <h2 class="h5 mb-1">Signpack created</h2>
          <p class="text-body-secondary small mb-0">Share the link below with the person who should sign the document.</p>
        </div>
        <span class="status-badge badge-uploaded">⬆ Uploaded</span>
      </div>

      <p class="section-title">Signing link</p>
      <div class="link-box mb-3">
        <span>{{ signLink() }}</span>
        <button class="btn btn-outline-secondary copy-btn" (click)="copy(signLink())">
          {{ copied() ? '✓ Copied' : 'Copy' }}
        </button>
      </div>
      <p class="text-body-secondary small mb-4">
        Anyone with this link can upload the signed version.
        @if (result()!.expiresAt) {
          Expires <strong>{{ result()!.expiresAt | date:'medium' }}</strong>.
        }
      </p>

      <button
        class="btn btn-primary d-inline-flex align-items-center gap-2"
        (click)="startPolling()"
      >
        <span>📡</span> Wait for signed version
      </button>
    </div>
  }

  <!-- ── Step 3: Status polling ── -->
  @if (step() === 'status' && result()) {
    <div class="row g-4">
      <div class="col-12 col-lg-7">

        @if (signedStatus() !== 'SIGNED') {
          <div class="poll-status mb-3">
            <div class="poll-spinner"></div>
            <div>
              <div class="fw-semibold">Waiting for signature…</div>
              <div class="text-body-secondary small">Polling every 5 seconds. Keep this tab open.</div>
            </div>
          </div>
        }

        @if (signedStatus() === 'SIGNED') {
          <div class="signed-box mb-4">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span style="font-size:1.4rem">✅</span>
              <strong>Document signed!</strong>
            </div>
            <p class="small text-body-secondary mb-3">
              The signed version has been uploaded. Download the bundle ZIP
              containing both the original and the signed file.
            </p>
            <a
              class="btn btn-primary d-inline-flex align-items-center gap-2"
              [href]="bundleHref()"
              download
            >
              <span>📦</span> Download Bundle ZIP
            </a>
          </div>
        }

        <div class="share-card">
          <p class="section-title mb-3">Signing link</p>
          <div class="link-box mb-2">
            <span>{{ signLink() }}</span>
            <button class="btn btn-outline-secondary copy-btn" (click)="copy(signLink())">
              {{ copied() ? '✓ Copied' : 'Copy' }}
            </button>
          </div>
          <p class="text-body-secondary small mb-0">
            @if (result()!.expiresAt) {
              Expires {{ result()!.expiresAt | date:'medium' }}.
            } @else {
              No expiry set.
            }
          </p>
        </div>
      </div>

      <div class="col-12 col-lg-5">
        <div class="share-card">
          <p class="section-title">Status</p>
          <div class="mb-2">
            <span class="status-badge"
              [class.badge-uploaded]="signedStatus() === 'UPLOADED'"
              [class.badge-signed]="signedStatus() === 'SIGNED'"
              [class.badge-expired]="signedStatus() === 'EXPIRED'"
              [class.badge-deleted]="signedStatus() === 'DELETED'"
            >{{ signedStatus() }}</span>
          </div>
          <div class="text-body-secondary small mt-3">ID: <code>{{ result()!.id }}</code></div>
        </div>
      </div>
    </div>
  }
</div>
  `,
})
export class SignpackUploadComponent {
  private readonly svc = inject(SignpackService);

  readonly step = signal<Step>('upload');
  readonly selectedFile = signal<File | null>(null);
  readonly uploading = signal(false);
  readonly uploadError = signal<string | null>(null);
  readonly result = signal<SignpackCreateResult | null>(null);
  readonly signedStatus = signal<SignpackStatus>('UPLOADED');
  readonly copied = signal(false);

  isDragOver = false;
  selectedExpiry = 0;
  readonly expiryOptions = EXPIRY_OPTIONS;

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly signLink = computed(() => {
    const r = this.result();
    if (!r) return '';
    return `${typeof window !== 'undefined' ? window.origin : ''}/signpack/sign/${r.id}?token=${r.token}`;
  });

  readonly bundleHref = computed(() => {
    const r = this.result();
    if (!r) return '#';
    return this.svc.bundleUrl(r.id, r.token);
  });

  onFileChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.selectedFile.set(file);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) this.selectedFile.set(file);
  }

  upload(): void {
    const file = this.selectedFile();
    if (!file) return;
    this.uploading.set(true);
    this.uploadError.set(null);
    this.svc.create(file, this.selectedExpiry || undefined).subscribe({
      next: (r) => {
        this.result.set(r);
        this.uploading.set(false);
        this.step.set('share');
      },
      error: (err) => {
        this.uploadError.set(err?.error?.message ?? 'Upload failed. Please try again.');
        this.uploading.set(false);
      },
    });
  }

  startPolling(): void {
    this.step.set('status');
    this.pollTimer = setInterval(() => this.poll(), 5000);
  }

  private poll(): void {
    const r = this.result();
    if (!r) return;
    this.svc.meta(r.id, r.token).subscribe({
      next: (meta) => {
        this.signedStatus.set(meta.status);
        if (meta.status === 'SIGNED' || meta.status === 'EXPIRED' || meta.status === 'DELETED') {
          this.stopPolling();
        }
      },
    });
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

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  }

  ngOnDestroy(): void { this.stopPolling(); }
}
