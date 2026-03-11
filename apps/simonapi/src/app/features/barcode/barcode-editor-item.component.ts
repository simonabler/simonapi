import { Component, EventEmitter, OnDestroy, OnInit, Output, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { LucideAngularModule, BarcodeIcon, Trash2Icon } from 'lucide-angular';
import { BarcodeService } from './barcode.service';
import { BarcodeRequest, StandardBarcodeType } from './models';
import { Subject, EMPTY } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil } from 'rxjs/operators';


/** EAN check-digit calculation (Luhn-style, same logic as backend). */
function eanCheckDigit(digits: string): string {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += parseInt(digits[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}

/**
 * Returns a ValidatorFn that checks barcode text against the selected type.
 * The validator is re-created each time the type changes via setValidators().
 */
function barcodeTextValidator(getType: () => string): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const text: string = (ctrl.value ?? '').trim();
    if (!text) return null; // required is handled by Validators.required
    const type = getType();

    switch (type) {
      case 'ean13': {
        if (!/^\d{12,13}$/.test(text))
          return { barcodeFormat: 'EAN-13: exactly 12 or 13 digits required' };
        if (text.length === 13 && eanCheckDigit(text.slice(0, 12)) !== text[12])
          return { barcodeFormat: `EAN-13: wrong check digit (expected ${eanCheckDigit(text.slice(0, 12))})` };
        return null;
      }
      case 'ean8': {
        if (!/^\d{7,8}$/.test(text))
          return { barcodeFormat: 'EAN-8: exactly 7 or 8 digits required' };
        if (text.length === 8 && eanCheckDigit(text.slice(0, 7)) !== text[7])
          return { barcodeFormat: `EAN-8: wrong check digit (expected ${eanCheckDigit(text.slice(0, 7))})` };
        return null;
      }
      case 'upca': {
        if (!/^\d{11,12}$/.test(text))
          return { barcodeFormat: 'UPC-A: exactly 11 or 12 digits required' };
        if (text.length === 12 && eanCheckDigit(text.slice(0, 11)) !== text[11])
          return { barcodeFormat: `UPC-A: wrong check digit (expected ${eanCheckDigit(text.slice(0, 11))})` };
        return null;
      }
      case 'itf14': {
        if (!/^\d{13,14}$/.test(text))
          return { barcodeFormat: 'ITF-14: exactly 13 or 14 digits required' };
        return null;
      }
      default:
        return null;
    }
  };
}

@Component({
  standalone: true,
  selector: 'app-barcode-editor-item',
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './barcode-editor-item.component.html',
  styleUrls: ['./barcode-editor-item.component.scss']
})
export class BarcodeEditorItemComponent implements OnInit, OnDestroy {
  @Input() removable = true;
  @Output() remove = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private api = inject(BarcodeService);

  readonly BarcodeIcon = BarcodeIcon;
  readonly Trash2Icon = Trash2Icon;

  previewUrl: string | null = null;
  loading = false;
  errorMsg: string | null = null;
  private destroy$ = new Subject<void>();

  form = this.fb.group({
    type: this.fb.control<StandardBarcodeType>('code128', { nonNullable: true }),
    text: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    includetext: this.fb.control<boolean>(true, { nonNullable: true }),
    scale: this.fb.control<number>(3, { nonNullable: true, validators: [Validators.min(1), Validators.max(10)] }),
    height: this.fb.control<number | null>(null, { validators: [Validators.min(0), Validators.max(200)] }),
  });

  ngOnInit(): void {
    // Attach type-aware validator and re-run it when the type changes
    const textCtrl = this.form.controls['text'];
    const getType = () => this.form.controls['type'].value;
    textCtrl.addValidators(barcodeTextValidator(getType));

    this.form.controls['type'].valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      textCtrl.updateValueAndValidity();
    });

    this.form.valueChanges.pipe(
      startWith(this.form.getRawValue()),
      map(() => this.buildReq()),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      debounceTime(300),
      switchMap(req => {
        // Show validation error inline instead of firing the request
        const formatErr = textCtrl.errors?.['barcodeFormat'];
        if (formatErr) {
          this.errorMsg = formatErr;
          this.revokePreview();
          return EMPTY;
        }
        this.errorMsg = null;
        if (!this.form.valid || !req.text) {
          this.revokePreview();
          return EMPTY;
        }
        this.loading = true;
        return this.api.preview$(req).pipe(
          catchError(err => {
            this.errorMsg = err?.error?.message ?? err?.message ?? 'Preview failed';
            this.revokePreview();
            this.loading = false;
            return EMPTY;
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(blob => {
      this.revokePreview();
      const url = URL.createObjectURL(blob);
      this.previewUrl = url;
      this.loading = false;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.revokePreview();
  }

  private buildReq(): BarcodeRequest {
    const v = this.form.getRawValue();
    return {
      type: v.type!,
      text: v.text || '',
      includetext: !!v.includetext,
      scale: v.scale ?? 3,
      height: v.height ?? undefined,
    };
  }

  private revokePreview() {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
  }

  async download(format: 'png' | 'svg') {
    const req = this.buildReq();
    await this.api.download(req, format);
  }
}

