import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, BarcodeIcon, Trash2Icon } from 'lucide-angular';
import { BarcodeService } from './barcode.service';
import {
  AiSpec,
  compileAiDb,
  extractGs1ErrorMessage,
  Gs1Request,
  Gs1Symbology,
  validateAiValue,
  validateCombination,
} from './models';
import { EMPTY, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil } from 'rxjs/operators';

type AiForm = FormGroup<{ ai: any; value: any }>;

@Component({
  standalone: true,
  selector: 'app-barcode-gs1-editor-item',
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './barcode-gs1-editor-item.component.html',
  styleUrls: ['./barcode-gs1-editor-item.component.scss'],
})
export class BarcodeGs1EditorItemComponent implements OnInit, OnDestroy {
  @Input() removable = false;
  @Output() remove = new EventEmitter<void>();

  private fb  = inject(FormBuilder);
  private api = inject(BarcodeService);

  readonly BarcodeIcon = BarcodeIcon;
  readonly Trash2Icon  = Trash2Icon;

  aiDb: Record<string, AiSpec> = {};
  get aiKeys() { return Object.keys(this.aiDb); }

  previewUrl:  string | null = null;
  loading      = false;
  /** Per-AI-row validation error messages (index matches items FormArray). */
  errors: (string | null)[] = [];
  /** Cross-AI combination error (e.g. mutually exclusive AIs). */
  globalError: string | null = null;
  /** Server-side error shown when the preview request fails. */
  serverError: string | null = null;

  private destroy$ = new Subject<void>();

  form = this.fb.group({
    symbology:   this.fb.control<Gs1Symbology>('gs1-128', { nonNullable: true }),
    includetext: this.fb.control<boolean>(true, { nonNullable: true }),
    scale:       this.fb.control<number>(3, { nonNullable: true, validators: [Validators.min(1), Validators.max(10)] }),
    height:      this.fb.control<number | null>(null, { validators: [Validators.min(0), Validators.max(200)] }),
    items:       this.fb.array<AiForm>([]),
  });

  get items() { return this.form.controls.items; }

  ngOnInit(): void {
    // Load AI registry from backend, then seed defaults
    this.api.getGs1Registry$().pipe(takeUntil(this.destroy$)).subscribe(json => {
      this.aiDb = compileAiDb(json);
      if (this.items.length === 0) {
        this.items.push(this.makeAi('01', '0950600013437'));
        this.items.push(this.makeAi('10', 'BATCH42'));
        this.items.push(this.makeAi('17', '251231'));
      }
      this.runValidation();
    });

    this.form.valueChanges.pipe(
      startWith(this.form.getRawValue()),
      map(() => this.buildReq()),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      debounceTime(300),
      switchMap(req => {
        this.runValidation();
        this.serverError = null;
        if (!this.form.valid || this.errors.some(Boolean) || !!this.globalError || req.items.length === 0) {
          this.revokePreview();
          return EMPTY;
        }
        this.loading = true;
        return this.api.previewGs1$(req).pipe(
          catchError(err => {
            // Show structured backend error when available, raw message otherwise
            const body = err?.error;
            this.serverError = extractGs1ErrorMessage(
              typeof body === 'string' ? tryParseJson(body) : body
            );
            this.revokePreview();
            this.loading = false;
            return EMPTY;
          }),
        );
      }),
      takeUntil(this.destroy$),
    ).subscribe(blob => {
      this.revokePreview();
      this.previewUrl = URL.createObjectURL(blob);
      this.loading = false;
      this.serverError = null;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.revokePreview();
  }

  private makeAi(ai = '01', value = ''): AiForm {
    return this.fb.group({
      ai:    this.fb.control<string>(ai,    { nonNullable: true }),
      value: this.fb.control<string>(value, { nonNullable: true, validators: [Validators.required] }),
    });
  }

  addItem()          { this.items.push(this.makeAi()); this.runValidation(); }
  removeItem(i: number) { this.items.removeAt(i);      this.runValidation(); }

  private buildReq(): Gs1Request {
    const v = this.form.getRawValue();
    return {
      symbology:   v.symbology!,
      items:       (v.items || [])
                     .map((x: any) => ({ ai: x.ai, value: x.value }))
                     .filter((x: any) => x.ai && x.value),
      includetext: !!v.includetext,
      scale:       v.scale  ?? 3,
      height:      v.height ?? undefined,
    };
  }

  private runValidation(): void {
    this.errors = this.items.controls.map(ctrl =>
      validateAiValue(this.aiDb, ctrl.value.ai, ctrl.value.value)
    );
    const items = this.items.controls.map(ctrl => ({
      ai:    String(ctrl.value.ai),
      value: String(ctrl.value.value),
    }));
    this.globalError = Object.keys(this.aiDb).length
      ? validateCombination(this.aiDb, items)
      : null;
  }

  private revokePreview(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
  }

  async download(format: 'png' | 'svg'): Promise<void> {
    await this.api.downloadGs1(this.buildReq(), format);
  }
}

/** Best-effort JSON parse — returns the original value on failure. */
function tryParseJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return s; }
}
