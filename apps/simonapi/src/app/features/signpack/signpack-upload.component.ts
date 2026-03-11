import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SignpackService } from './signpack.service';

interface ExpiryOption { label: string; minutes: number }

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB — must match server FILE_MAX_BYTES

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
    .file-name { font-weight: 700; font-size: 1rem; word-break: break-all; }
    .file-size { font-size: .8rem; color: var(--bs-secondary-color); margin-top: .2rem; }

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

    .section-title {
      font-weight: 700;
      font-size: .85rem;
      letter-spacing: .04em;
      text-transform: uppercase;
      color: var(--bs-secondary-color);
      margin-bottom: .75rem;
    }

    .spinner {
      width: 18px; height: 18px;
      border: 2.5px solid var(--border);
      border-top-color: #0f172a;
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
  template: `
<div class="container py-4">
  <div class="mb-5">
    <p class="sp-label">Signpack</p>
    <h1 class="sp-title">Secure document<br>hand-off &amp; signing</h1>
    <p class="sp-sub">
      Upload a file, share a one-time link, receive the signed version —
      no account needed, token-protected.
    </p>
  </div>

  <div class="row g-4">
    <div class="col-12 col-lg-7">
      <p class="section-title">Select file</p>
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
      @if (fileError()) {
        <div class="alert alert-danger py-2 small mt-2 mb-0">⚠️ {{ fileError() }}</div>
      }
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
          <span class="spinner"></span> Uploading…
        } @else {
          <span>🔒</span> Create Signpack
        }
      </button>
    </div>
  </div>
</div>
  `,
})
export class SignpackUploadComponent {
  private readonly svc    = inject(SignpackService);
  private readonly router = inject(Router);

  readonly selectedFile  = signal<File | null>(null);
  readonly uploading     = signal(false);
  readonly uploadError   = signal<string | null>(null);
  readonly fileError     = signal<string | null>(null);

  isDragOver     = false;
  selectedExpiry = 0;
  readonly expiryOptions = EXPIRY_OPTIONS;

  private setFile(f: File): void {
    if (f.size > MAX_FILE_BYTES) {
      this.fileError.set(`File too large (${this.formatBytes(f.size)}). Maximum is 25 MB.`);
      this.selectedFile.set(null);
      return;
    }
    this.fileError.set(null);
    this.selectedFile.set(f);
  }

  onFileChange(e: Event): void {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) this.setFile(f);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver = false;
    const f = e.dataTransfer?.files?.[0];
    if (f) this.setFile(f);
  }

  upload(): void {
    const file = this.selectedFile();
    if (!file) return;
    this.uploading.set(true);
    this.uploadError.set(null);

    this.svc.create(file, this.selectedExpiry || undefined).subscribe({
      next: (r) => {
        // Navigate to the persistent status page — the URL is the sender's bookmark
        this.router.navigate(['/signpack/status', r.id], {
          queryParams: { token: r.token },
        });
      },
      error: (err) => {
        this.uploadError.set(err?.error?.message ?? 'Upload failed. Please try again.');
        this.uploading.set(false);
      },
    });
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  }
}
