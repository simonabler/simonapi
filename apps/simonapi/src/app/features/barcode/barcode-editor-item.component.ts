import { Component, EventEmitter, OnDestroy, OnInit, Output, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, BarcodeIcon, Trash2Icon } from 'lucide-angular';
import { BarcodeService } from './barcode.service';
import { BarcodeRequest, StandardBarcodeType } from './models';
import { Subject, EMPTY } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil } from 'rxjs/operators';

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
  private destroy$ = new Subject<void>();

  form = this.fb.group({
    type: this.fb.control<StandardBarcodeType>('code128', { nonNullable: true }),
    text: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    includetext: this.fb.control<boolean>(true, { nonNullable: true }),
    scale: this.fb.control<number>(3, { nonNullable: true, validators: [Validators.min(1), Validators.max(10)] }),
    height: this.fb.control<number | null>(null, { validators: [Validators.min(0), Validators.max(200)] }),
  });

  ngOnInit(): void {
    this.form.valueChanges.pipe(
      startWith(this.form.getRawValue()),
      map(() => this.buildReq()),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      debounceTime(300),
      switchMap(req => {
        if (!this.form.valid || !req.text) {
          this.revokePreview();
          return EMPTY;
        }
        this.loading = true;
        return this.api.preview$(req).pipe(
          catchError(err => {
            console.error(err);
            this.revokePreview();
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

