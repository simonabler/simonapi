import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SignpackService } from './signpack.service';
import { SignpackMeta } from './signpack.models';

type SignStep = 'loading' | 'error' | 'ready' | 'uploading' | 'done' | 'expired';

@Component({
  standalone: true,
  selector: 'app-signpack-sign',
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
      margin-bottom: .75rem;
    }

    /* Status badges */
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

    /* Info card */
    .info-card {
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      background: var(--surface);
      margin-bottom: 1.5rem;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: .5rem 0;
      font-size: .88rem;
      border-bottom: 1px solid var(--border, #e2e8f0);
    }
    .meta-row:last-child { border-bottom: none; }
    .meta-label { color: var(--bs-secondary-color); }
    .meta-value { font-weight: 600; word-break: break-all; text-align: right; }

    .section-title {
      font-weight: 700;
      font-size: .85rem;
      letter-spacing: .04em;
      text-transform: uppercase;
      color: var(--bs-secondary-color);
      margin-bottom: .75rem;
    }

    /* Drop zone */
    .drop-zone {
      border: 2px dashed var(--border, #e2e8f0);
      border-radius: var(--radius-lg);
      padding: 2.5rem 2rem;
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
    .drop-icon { font-size: 2rem; margin-bottom: .6rem; display: block; }
    .drop-hint { color: var(--bs-secondary-color); font-size: .87rem; margin-top: .3rem; }
    .file-info { font-weight: 700; word-break: break-all; }

    /* Spinner */
    .spinner {
      width: 18px; height: 18px;
      border: 2.5px solid var(--border);
      border-top-color: #0f172a;
      border-radius: 50%;
      animation: spin .7s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Done box */
    .done-box {
      padding: 2rem;
      border-radius: var(--radius-lg);
      border: 2px solid #22c55e;
      background: color-mix(in oklab,#22c55e,transparent 90%);
      text-align: center;
    }
    .done-icon { font-size: 3rem; margin-bottom: 1rem; display: block; }

    /* Error/expired box */
    .error-box {
      padding: 2rem;
      border-radius: var(--radius-lg);
      border: 2px solid #ef4444;
      background: color-mix(in oklab,#ef4444,transparent 92%);
    }

    /* Loading skeleton */
    .skeleton {
      height: 1rem;
      background: linear-gradient(90deg, var(--border) 25%, color-mix(in oklab,var(--border),white 30%) 50%, var(--border) 75%);
      background-size: 200% 100%;
      border-radius: .25rem;
      animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer { to { background-position: -200% 0; } }
  `],
  template: `
<div class="container py-4">
  <div class="row justify-content-center">
    <div class="col-12 col-lg-8">

      <!-- Loading -->
      @if (signStep() === 'loading') {
        <div class="sp-hero py-4">
          <div class="skeleton mb-3" style="width: 100px; height:.65rem"></div>
          <div class="skeleton mb-2" style="width: 70%; height: 2rem"></div>
          <div class="skeleton" style="width: 50%; height: 1rem"></div>
        </div>
      }

      <!-- Error -->
      @if (signStep() === 'error') {
        <div class="error-box mt-5">
          <h2 class="h5 mb-2">⚠️ Could not load Signpack</h2>
          <p class="text-body-secondary small mb-0">{{ loadError() }}</p>
        </div>
      }

      <!-- Expired -->
      @if (signStep() === 'expired') {
        <div class="error-box mt-5">
          <h2 class="h5 mb-2">⏰ Link expired</h2>
          <p class="text-body-secondary small mb-0">
            This signpack has expired and can no longer be accessed.
          </p>
        </div>
      }

      <!-- Ready to sign -->
      @if ((signStep() === 'ready' || signStep() === 'uploading') && meta()) {
        <div class="py-3 mb-4">
          <p class="sp-label">Signpack — sign document</p>
          <h1 class="sp-title">You've been asked<br>to sign a file</h1>
          <p class="text-body-secondary" style="max-width:480px;line-height:1.65">
            Download the original document below, sign it, then upload the signed version.
          </p>
        </div>

        <!-- Original file info -->
        <div class="info-card">
          <div class="d-flex align-items-center justify-content-between mb-3">
            <p class="section-title mb-0">Document to sign</p>
            <span class="status-badge badge-uploaded">Awaiting signature</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Signpack ID</span>
            <span class="meta-value"><code>{{ id }}</code></span>
          </div>
          @if (meta()?.expiresAt) {
            <div class="meta-row">
              <span class="meta-label">Expires</span>
              <span class="meta-value">{{ meta()!.expiresAt | date:'medium' }}</span>
            </div>
          }
          <div class="meta-row">
            <span class="meta-label">Created</span>
            <span class="meta-value">{{ meta()!.createdAt | date:'medium' }}</span>
          </div>
          <div class="mt-3">
            <a
              class="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2"
              [href]="originalHref"
              download
            >
              <span>⬇️</span> Download original
            </a>
          </div>
        </div>

        <!-- Upload signed version -->
        <p class="section-title">Upload signed version</p>

        <div
          class="drop-zone mb-3"
          [class.has-file]="!!signedFile()"
          [class.drag-over]="isDragOver"
          (click)="signInput.click()"
          (dragover)="$event.preventDefault(); isDragOver = true"
          (dragleave)="isDragOver = false"
          (drop)="onDrop($event)"
        >
          @if (signedFile(); as f) {
            <span class="drop-icon">📄</span>
            <div class="file-info">{{ f.name }}</div>
            <div class="drop-hint">{{ formatBytes(f.size) }} · click to replace</div>
          } @else {
            <span class="drop-icon">⬆️</span>
            <div class="fw-semibold">Drop signed file here or click to browse</div>
            <div class="drop-hint">Max 25 MB</div>
          }
        </div>
        <input #signInput type="file" hidden (change)="onFileChange($event)">

        @if (signError()) {
          <div class="alert alert-danger py-2 small mb-3">{{ signError() }}</div>
        }

        <button
          class="btn btn-primary d-flex align-items-center gap-2"
          [disabled]="!signedFile() || signStep() === 'uploading'"
          (click)="submitSign()"
        >
          @if (signStep() === 'uploading') {
            <span class="spinner"></span> Uploading…
          } @else {
            <span>✅</span> Submit signed version
          }
        </button>
      }

      <!-- Done -->
      @if (signStep() === 'done') {
        <div class="done-box mt-5">
          <span class="done-icon">🎉</span>
          <h2 class="h4 mb-2">Signed version uploaded!</h2>
          <p class="text-body-secondary mb-0">
            The sender has been notified. They can now download the bundle
            containing both the original and your signed version.
          </p>
        </div>
      }

    </div>
  </div>
</div>
  `,
})
export class SignpackSignComponent implements OnInit {
  private readonly svc = inject(SignpackService);
  private readonly route = inject(ActivatedRoute);

  readonly signStep = signal<SignStep>('loading');
  readonly meta = signal<SignpackMeta | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly signedFile = signal<File | null>(null);
  readonly signError = signal<string | null>(null);

  isDragOver = false;
  id = '';
  token = '';
  originalHref = '';

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!this.id || !this.token) {
      this.loadError.set('Missing signpack ID or token in URL.');
      this.signStep.set('error');
      return;
    }

    this.originalHref = this.svc.originalUrl(this.id, this.token);

    this.svc.meta(this.id, this.token).subscribe({
      next: (m) => {
        this.meta.set(m);
        if (m.status === 'EXPIRED') {
          this.signStep.set('expired');
        } else if (m.status === 'SIGNED' || m.status === 'DELETED') {
          // Already signed — show done state
          this.signStep.set('done');
        } else {
          this.signStep.set('ready');
        }
      },
      error: (err) => {
        this.loadError.set(err?.error?.message ?? 'Signpack not found or link is invalid.');
        this.signStep.set('error');
      },
    });
  }

  onFileChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.signedFile.set(file);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) this.signedFile.set(file);
  }

  submitSign(): void {
    const file = this.signedFile();
    if (!file) return;
    this.signStep.set('uploading');
    this.signError.set(null);

    this.svc.sign(this.id, this.token, file).subscribe({
      next: () => this.signStep.set('done'),
      error: (err) => {
        this.signError.set(err?.error?.message ?? 'Upload failed. Please try again.');
        this.signStep.set('ready');
      },
    });
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  }
}
