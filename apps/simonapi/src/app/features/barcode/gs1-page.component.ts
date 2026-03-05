import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ArrowLeftIcon, LucideAngularModule, MailIcon, PlusIcon, Trash2Icon } from 'lucide-angular';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { BarcodeService } from './barcode.service';
import { BarcodeGs1EditorItemComponent } from './barcode-gs1-editor-item.component';
import {
  Gs1BatchRequest,
  Gs1BatchResultItem,
  Gs1Item,
  DigitalLinkEncodeResult,
} from './models';
import { SsccGeneratorComponent } from './sscc-generator.component';

type TierFeature = { text: string; included: boolean };
type Tier = {
  key: string; name: string; price: string; period: string;
  features: TierFeature[]; limit: string;
  cta: { label: string; href: string; variant: 'primary' | 'outline' } | null;
  featured: boolean;
};

@Component({
  standalone: true,
  selector: 'app-gs1-page',
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    LucideAngularModule, BarcodeGs1EditorItemComponent,
  ],
  templateUrl: './gs1-page.component.html',
})
export class Gs1PageComponent implements OnDestroy {
  readonly ArrowLeftIcon = ArrowLeftIcon;
  readonly MailIcon      = MailIcon;
  readonly PlusIcon      = PlusIcon;
  readonly Trash2Icon    = Trash2Icon;

  private fb       = inject(FormBuilder);
  private api      = inject(BarcodeService);
  private destroy$ = new Subject<void>();

  // ── Active Tab ──────────────────────────────────────────
  activeTab: 'single' | 'batch' | 'digitallink' | 'sscc' = 'single';

  // ── Batch ───────────────────────────────────────────────
  batchForm = this.fb.group({
    symbology:   this.fb.control<'gs1-128' | 'gs1datamatrix'>('gs1-128', { nonNullable: true }),
    format:      this.fb.control<'png' | 'svg'>('png', { nonNullable: true }),
    includetext: this.fb.control<boolean>(true, { nonNullable: true }),
    barcodes:    this.fb.array([ this.makeBarcodeRow() ]),
  });

  get barcodeRows() { return this.batchForm.controls.barcodes; }

  batchLoading  = false;
  batchError:   string | null = null;
  batchResults: Gs1BatchResultItem[] = [];

  addBarcodeRow()            { this.barcodeRows.push(this.makeBarcodeRow()); }
  removeBarcodeRow(i: number){ this.barcodeRows.removeAt(i); }

  private makeBarcodeRow() {
    return this.fb.group({
      ref:  this.fb.control<string>('', { nonNullable: true }),
      ai01: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
      ai17: this.fb.control<string>('', { nonNullable: true }),
    });
  }

  runBatch(): void {
    if (this.batchForm.invalid) return;
    const v = this.batchForm.getRawValue();

    const req: Gs1BatchRequest = {
      symbology:   v.symbology,
      format:      v.format,
      includetext: v.includetext,
      barcodes: v.barcodes.map(row => {
        const items: Gs1Item[] = [{ ai: '01', value: row.ai01 }];
        if (row.ai17?.trim()) items.push({ ai: '17', value: row.ai17 });
        return { ref: row.ref || undefined, items };
      }),
    };

    this.batchLoading = true;
    this.batchError   = null;
    this.batchResults = [];

    this.api.gs1Batch$(req).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.batchLoading = false),
    ).subscribe({
      next:  results => this.batchResults = results,
      error: err     => this.batchError = err?.error?.message ?? err?.message ?? 'Batch request failed',
    });
  }

  downloadBatchItem(item: Gs1BatchResultItem, format: 'png' | 'svg'): void {
    if (!item.data) return;
    const filename = `gs1-batch-${item.ref ?? item.index}.${format}`;
    if (format === 'svg') {
      this.triggerDownload(new Blob([item.data], { type: 'image/svg+xml' }), filename);
    } else {
      const binary = atob(item.data);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      this.triggerDownload(new Blob([bytes], { type: 'image/png' }), filename);
    }
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ── Digital Link ────────────────────────────────────────
  dlTab: 'encode' | 'decode' = 'encode';

  encodeForm = this.fb.group({
    baseUrl: this.fb.control<string>('https://id.example.com', { nonNullable: true }),
    ai01:    this.fb.control<string>('09506000134376', { nonNullable: true, validators: [Validators.required] }),
    ai17:    this.fb.control<string>('251231', { nonNullable: true }),
    ai10:    this.fb.control<string>('BATCH42', { nonNullable: true }),
  });

  decodeForm = this.fb.group({
    url: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
  });

  encodeLoading = false;
  encodeResult: DigitalLinkEncodeResult | null = null;
  encodeError:  string | null = null;

  decodeLoading = false;
  decodeResult: Gs1Item[] | null = null;
  decodeError:  string | null = null;

  runEncode(): void {
    if (this.encodeForm.invalid) return;
    const v = this.encodeForm.getRawValue();
    const items: Gs1Item[] = [{ ai: '01', value: v.ai01 }];
    if (v.ai17?.trim()) items.push({ ai: '17', value: v.ai17 });
    if (v.ai10?.trim()) items.push({ ai: '10', value: v.ai10 });

    this.encodeLoading = true;
    this.encodeResult  = null;
    this.encodeError   = null;

    this.api.digitalLinkEncode$({ items, baseUrl: v.baseUrl || undefined }).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.encodeLoading = false),
    ).subscribe({
      next:  result => this.encodeResult = result,
      error: err    => this.encodeError = err?.error?.message ?? err?.message ?? 'Encode failed',
    });
  }

  runDecode(): void {
    if (this.decodeForm.invalid) return;
    const v = this.decodeForm.getRawValue();

    this.decodeLoading = true;
    this.decodeResult  = null;
    this.decodeError   = null;

    this.api.digitalLinkDecode$({ url: v.url }).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.decodeLoading = false),
    ).subscribe({
      next:  items => this.decodeResult = items,
      error: err   => this.decodeError = err?.error?.message ?? err?.message ?? 'Decode failed',
    });
  }

  async copy(text: string): Promise<void> {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Tiers ───────────────────────────────────────────────
  readonly tiers: Tier[] = [
    {
      key: 'free', name: 'Free', price: '€0', period: '/ month',
      features: [
        { text: 'Standard Barcodes (PNG/SVG)', included: true },
        { text: 'QR Codes', included: true },
        { text: 'GS1 AI Registry (Lookup)', included: true },
        { text: 'GS1-128 / DataMatrix', included: false },
        { text: 'Batch generation', included: false },
        { text: 'Digital Link', included: false },
      ],
      limit: '⚡ 10 req/min',
      cta: null, featured: false,
    },
    {
      key: 'pro', name: 'Pro', price: '€29', period: '/ month',
      features: [
        { text: 'Everything in Free', included: true },
        { text: 'GS1-128 & DataMatrix', included: true },
        { text: 'GS1 Digital Link encode/decode', included: true },
        { text: 'Full AI validation', included: true },
        { text: 'Batch generation', included: false },
      ],
      limit: '⚡ 100 req/min · 10,000 req/day',
      cta: { label: 'Request key', href: 'mailto:simon@abler.tirol?subject=GS1 Pro API Key', variant: 'primary' },
      featured: true,
    },
    {
      key: 'industrial', name: 'Industrial', price: '€99', period: '/ month',
      features: [
        { text: 'Everything in Pro', included: true },
        { text: 'Batch up to 100 barcodes/request', included: true },
        { text: 'Base64-PNG + SVG in batch', included: true },
        { text: 'Priority Support', included: true },
        { text: 'SLA on request', included: true },
      ],
      limit: '⚡ 1,000 req/min · unlimited/day',
      cta: { label: 'Request key', href: 'mailto:simon@abler.tirol?subject=GS1 Industrial API Key', variant: 'outline' },
      featured: false,
    },
  ];
}
