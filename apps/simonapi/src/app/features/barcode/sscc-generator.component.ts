import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, RefreshCwIcon, Trash2Icon } from 'lucide-angular';
import { Subject, debounceTime, distinctUntilChanged, EMPTY } from 'rxjs';
import { finalize, switchMap, takeUntil } from 'rxjs/operators';
import { BarcodeService } from './barcode.service';
import { SsccPrefixInfo, SsccValidateResult } from './models';

@Component({
  standalone: true,
  selector: 'app-sscc-generator',
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './sscc-generator.component.html',
})
export class SsccGeneratorComponent implements OnDestroy {
  private fb      = inject(FormBuilder);
  private api     = inject(BarcodeService);
  private destroy$ = new Subject<void>();

  readonly RefreshCwIcon = RefreshCwIcon;
  readonly Trash2Icon    = Trash2Icon;

  activeTab: 'build' | 'auto' | 'validate' = 'build';

  // ── Build Form ──────────────────────────────────────────
  buildForm = this.fb.group({
    extensionDigit:  this.fb.control<number>(3,   { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(9)] }),
    companyPrefix:   this.fb.control<string>('',  { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{7,10}$/)] }),
    serialReference: this.fb.control<string>('1', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{1,9}$/)] }),
    format:          this.fb.control<'png'|'svg'>('png', { nonNullable: true }),
    includetext:     this.fb.control<boolean>(true, { nonNullable: true }),
  });

  buildLoading  = false;
  buildError:   string | null = null;
  buildPreview: string | null = null;
  buildSscc:    string | null = null;
  prefixInfo:   SsccPrefixInfo | null = null;
  prefixLoading = false;

  // ── Auto Form ──────────────────────────────────────────
  autoForm = this.fb.group({
    extensionDigit: this.fb.control<number>(3,  { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(9)] }),
    companyPrefix:  this.fb.control<string>('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{7,10}$/)] }),
    format:         this.fb.control<'png'|'svg'>('png', { nonNullable: true }),
    includetext:    this.fb.control<boolean>(true, { nonNullable: true }),
  });

  autoLoading  = false;
  autoError:   string | null = null;
  autoPreview: string | null = null;
  autoSscc:    string | null = null;
  autoSerial:  string | null = null;
  counterState: { prefixKey: string; lastSerial: number } | null = null;

  // ── Validate Form ──────────────────────────────────────
  validateForm = this.fb.group({
    sscc: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{18}$/)] }),
  });

  validateResult: SsccValidateResult | null = null;
  validateError:  string | null = null;

  constructor() {
    // Live prefix lookup on buildForm
    this.buildForm.controls.companyPrefix.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(prefix => {
        if (!/^\d{7,10}$/.test(prefix)) { this.prefixInfo = null; return EMPTY; }
        this.prefixLoading = true;
        return this.api.ssccPrefixInfo$(prefix).pipe(
          finalize(() => this.prefixLoading = false),
        );
      }),
      takeUntil(this.destroy$),
    ).subscribe({ next: info => this.prefixInfo = info });
  }

  runBuild(): void {
    if (this.buildForm.invalid) return;
    const v = this.buildForm.getRawValue();
    this.buildLoading = true;
    this.buildError   = null;

    this.api.ssccBuild$({
      extensionDigit:  v.extensionDigit,
      companyPrefix:   v.companyPrefix,
      serialReference: v.serialReference,
      format:          v.format,
      includetext:     v.includetext,
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.buildLoading = false),
    ).subscribe({
      next: blob => {
        this.revoke(this.buildPreview);
        this.buildPreview = URL.createObjectURL(blob);
        this.buildSscc = null; // will be in x-sscc header — not accessible from Angular HTTP
      },
      error: err => this.buildError = err?.error?.message ?? err?.message ?? 'Build failed',
    });
  }

  runAuto(): void {
    if (this.autoForm.invalid) return;
    const v = this.autoForm.getRawValue();
    this.autoLoading = true;
    this.autoError   = null;

    this.api.ssccAuto$({
      extensionDigit: v.extensionDigit,
      companyPrefix:  v.companyPrefix,
      format:         v.format,
      includetext:    v.includetext,
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.autoLoading = false),
    ).subscribe({
      next: blob => {
        this.revoke(this.autoPreview);
        this.autoPreview = URL.createObjectURL(blob);
        // Load updated counter
        this.loadCounter(v.extensionDigit, v.companyPrefix);
      },
      error: err => this.autoError = err?.error?.message ?? err?.message ?? 'Auto-allocate failed',
    });
  }

  loadCounter(ext: number, prefix: string): void {
    if (!/^\d{7,10}$/.test(prefix)) return;
    this.api.ssccCounter$(ext, prefix).pipe(takeUntil(this.destroy$))
      .subscribe({ next: s => this.counterState = s });
  }

  runValidate(): void {
    if (this.validateForm.invalid) return;
    const { sscc } = this.validateForm.getRawValue();
    this.validateResult = null;
    this.validateError  = null;

    this.api.ssccValidate$({ sscc }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  r => this.validateResult = r,
        error: err => this.validateError = err?.error?.message ?? 'Validation failed',
      });
  }

  download(blobUrl: string | null, ext: string): void {
    if (!blobUrl) return;
    const a = Object.assign(document.createElement('a'), {
      href: blobUrl, download: `sscc.${ext}`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async copy(text: string): Promise<void> {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  }

  private revoke(url: string | null): void {
    if (url) URL.revokeObjectURL(url);
  }

  ngOnDestroy(): void {
    this.revoke(this.buildPreview);
    this.revoke(this.autoPreview);
    this.destroy$.next();
    this.destroy$.complete();
  }
}
