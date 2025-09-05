import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, BarcodeIcon, Trash2Icon } from 'lucide-angular';
import { BarcodeService } from './barcode.service';
import { AI_DB, Gs1Request, Gs1Symbology, validateAiValue } from './models';
import { EMPTY, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil } from 'rxjs/operators';

type AiForm = FormGroup<{ ai: any; value: any }>;

@Component({
  standalone: true,
  selector: 'app-barcode-gs1-editor-item',
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './barcode-gs1-editor-item.component.html',
  styleUrls: ['./barcode-gs1-editor-item.component.scss']
})
export class BarcodeGs1EditorItemComponent implements OnInit, OnDestroy {
  @Input() removable = false;
  @Output() remove = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private api = inject(BarcodeService);

  readonly BarcodeIcon = BarcodeIcon;
  readonly Trash2Icon = Trash2Icon;
  readonly AI_DB = AI_DB;
  readonly aiKeys = Object.keys(AI_DB);

  previewUrl: string | null = null;
  loading = false;
  errors: (string | null)[] = [];
  private destroy$ = new Subject<void>();

  form = this.fb.group({
    symbology: this.fb.control<Gs1Symbology>('gs1-128', { nonNullable: true }),
    includetext: this.fb.control<boolean>(true, { nonNullable: true }),
    scale: this.fb.control<number>(3, { nonNullable: true, validators: [Validators.min(1), Validators.max(10)] }),
    height: this.fb.control<number | null>(null, { validators: [Validators.min(0), Validators.max(200)] }),
    items: this.fb.array<AiForm>([]),
  });

  get items() { return this.form.controls.items; }

  ngOnInit(): void {
    // Seed some common AIs
    if (this.items.length === 0) {
      this.items.push(this.makeAi('01', '0950600013437'));
      this.items.push(this.makeAi('10', 'BATCH42'));
      this.items.push(this.makeAi('17', '251231'));
    }

    this.form.valueChanges.pipe(
      startWith(this.form.getRawValue()),
      map(() => this.buildReq()),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      debounceTime(300),
      switchMap(req => {
        this.runValidation();
        if (!this.form.valid || this.errors.some(Boolean) || req.items.length === 0) {
          this.revokePreview();
          return EMPTY;
        }
        this.loading = true;
        return this.api.previewGs1$(req).pipe(
          catchError(err => { console.error(err); this.revokePreview(); return EMPTY; })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(blob => {
      this.revokePreview();
      this.previewUrl = URL.createObjectURL(blob);
      this.loading = false;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next(); this.destroy$.complete(); this.revokePreview();
  }

  private makeAi(ai: string = '01', value: string = ''): AiForm {
    return this.fb.group({
      ai: this.fb.control<string>(ai, { nonNullable: true }),
      value: this.fb.control<string>(value, { nonNullable: true, validators: [Validators.required] }),
    });
  }

  addItem() { this.items.push(this.makeAi()); this.runValidation(); }
  removeItem(i: number) { this.items.removeAt(i); this.runValidation(); }

  private buildReq(): Gs1Request {
    const v = this.form.getRawValue();
    return {
      symbology: v.symbology!,
      items: (v.items || []).map((x: any) => ({ ai: x.ai, value: x.value })).filter((x: any) => x.ai && x.value),
      includetext: !!v.includetext,
      scale: v.scale ?? 3,
      height: v.height ?? undefined,
    };
  }

  private runValidation() {
    const list = this.items.controls.map((ctrl) => validateAiValue(ctrl.value.ai, ctrl.value.value));
    this.errors = list;
  }

  private revokePreview() {
    if (this.previewUrl) { URL.revokeObjectURL(this.previewUrl); this.previewUrl = null; }
  }

  async download(format: 'png' | 'svg') {
    const req = this.buildReq();
    await this.api.downloadGs1(req, format);
  }
}

