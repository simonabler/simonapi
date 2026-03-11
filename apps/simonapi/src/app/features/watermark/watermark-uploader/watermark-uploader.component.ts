import {
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { debounceTime, filter, Subscription } from 'rxjs';
import { WatermarkAnchor, WatermarkOptions, WatermarkService } from '../watermark.service';
import { DndDirective } from './dnd.directive';

const MAX_FILE_BYTES = 26214400; // 25 MB — must match backend limits.fileSize

@Component({
  selector: 'app-watermark-uploader',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DndDirective],
  templateUrl: './watermark-uploader.component.html',
  styleUrls: ['./watermark-uploader.component.scss'],
})
export class WatermarkUploaderComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);

  private svc = inject(WatermarkService);

  form!: FormGroup;

  mainFile: File | null = null;
  logoFile: File | null = null;
  mainFileUrl: string | null = null;
  logoFileUrl: string | null = null;
  previewUrl: string | null = null;

  loading = false;
  errorMsg: string | null = null;
  mainFileError: string | null = null;
  logoFileError: string | null = null;

  dragging = false;
  dragOffsetX = 0;
  dragOffsetY = 0;

  @ViewChild('previewCanvas', { static: false })
  previewCanvas?: ElementRef<HTMLDivElement>;

  @ViewChild('previewImg', { static: false })
  previewImg?: ElementRef<HTMLImageElement>;

  /** Natural pixel dimensions of the loaded image — used to scale drag coords */
  private naturalWidth = 0;
  private naturalHeight = 0;

  onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    this.naturalWidth = img.naturalWidth;
    this.naturalHeight = img.naturalHeight;
  }

  /** Scale factor: CSS pixels → image pixels */
  private get scaleX(): number {
    if (!this.previewImg || !this.naturalWidth) return 1;
    const rendered = this.previewImg.nativeElement.getBoundingClientRect().width;
    return rendered > 0 ? this.naturalWidth / rendered : 1;
  }

  private get scaleY(): number {
    if (!this.previewImg || !this.naturalHeight) return 1;
    const rendered = this.previewImg.nativeElement.getBoundingClientRect().height;
    return rendered > 0 ? this.naturalHeight / rendered : 1;
  }

  private subs = new Subscription();

  fonts = [
    'Arial',
    'Roboto',
    'Times New Roman',
    'Courier New',
    'Georgia',
    'Impact',
    'Verdana',
  ];
  anchors: WatermarkAnchor[] = [
    'bottom-right',
    'bottom-center',
    'bottom-left',
    'center-right',
    'center',
    'center-left',
    'top-right',
    'top-center',
    'top-left',
  ];


  private formatBytes(bytes: number): string {
    return bytes > 1_048_576
      ? `${(bytes / 1_048_576).toFixed(1)} MB`
      : `${(bytes / 1024).toFixed(0)} KB`;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      mode: ['text', Validators.required],
      positionMode: ['absolute' as 'absolute' | 'anchor'],
      anchor: ['bottom-right'],
      // position stored as separate controls; combined on submit as "x,y"
      positionX: [20, [Validators.required, Validators.min(0)]],
      positionY: [20, [Validators.required, Validators.min(0)]],
      opacity: [
        0.5,
        [Validators.required, Validators.min(0), Validators.max(1)],
      ],
      scale: [
        1,
        [Validators.required, Validators.min(0.1), Validators.max(10)],
      ],
      margin: [0, [Validators.required, Validators.min(0)]],
      rotate: [
        0,
        [Validators.required, Validators.min(-360), Validators.max(360)],
      ],
      tile: [false],
      gap: [0, [Validators.required, Validators.min(0)]],

      text: ['Sample Watermark'],
      fontSize: [36, [Validators.min(6), Validators.max(300)]],
      fontFamily: ['Arial'],
      color: ['#000000'],
      strokeColor: ['#ffffff'],
      strokeWidth: [0, [Validators.min(0), Validators.max(50)]],

      autoPreview: [true],
    });

    // Auto-preview on form changes with debounce if enabled
    this.subs.add(
      this.form.valueChanges
        .pipe(
          debounceTime(500),
          filter(() => !!this.form.get('autoPreview')?.value && !!this.mainFile)
        )
        .subscribe(() => this.updatePreview())
    );
  }

  ngOnDestroy(): void {
    this.cleanupObjectUrl('previewUrl');
    this.cleanupObjectUrl('mainFileUrl');
    this.cleanupObjectUrl('logoFileUrl');
    this.subs.unsubscribe();
  }

  // Helpers to manage object URLs
  private cleanupObjectUrl(key: 'previewUrl' | 'mainFileUrl' | 'logoFileUrl') {
    const url = this[key];
    if (url) {
      URL.revokeObjectURL(url);
      this[key] = null;
    }
  }

  // Drop/Select Handlers
  onMainDropped(files: FileList | File[]): void {
    const file = this.pickImageFile(files);
    if (file) this.setMainFile(file);
  }
  onLogoDropped(files: FileList | File[]): void {
    const file = this.pickImageFile(files);
    if (file) this.setLogoFile(file);
  }
  onMainSelected(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (file) this.setMainFile(file);
    input.value = '';
  }
  onLogoSelected(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (file) this.setLogoFile(file);
    input.value = '';
  }

  private pickImageFile(files: FileList | File[]): File | null {
    const list: File[] = files instanceof FileList ? Array.from(files) : files;
    const img = list.find((f) => f.type.startsWith('image/')) ?? null;
    return img ?? null;
  }

  private setMainFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      this.mainFileError = `File too large (${this.formatBytes(file.size)}). Max 25 MB.`;
      return;
    }
    this.mainFileError = null;
    this.mainFile = file;
    this.cleanupObjectUrl('mainFileUrl');
    this.mainFileUrl = URL.createObjectURL(file);
    this.cleanupObjectUrl('previewUrl');
    if (this.form.get('autoPreview')?.value) {
      this.updatePreview();
    }
  }

  private setLogoFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      this.logoFileError = `File too large (${this.formatBytes(file.size)}). Max 25 MB.`;
      return;
    }
    this.logoFileError = null;
    this.logoFile = file;
    this.cleanupObjectUrl('logoFileUrl');
    this.logoFileUrl = URL.createObjectURL(file);
    this.form.patchValue({ mode: 'logo' });
    if (this.form.get('autoPreview')?.value && this.mainFile) {
      this.updatePreview();
    }
  }

  // Dragging overlay inside preview
  startDrag(event: PointerEvent) {
    if (!this.previewCanvas) return;
    const imgEl = this.previewImg?.nativeElement ?? this.previewCanvas.nativeElement;
    const rect = imgEl.getBoundingClientRect();
    // Convert stored image-pixel coords back to CSS-pixel space for drag offset
    const x = (this.form.value.positionX ?? 0) / this.scaleX;
    const y = (this.form.value.positionY ?? 0) / this.scaleY;
    if (this.form.value.positionMode !== 'absolute') {
      this.form.patchValue({ positionMode: 'absolute' });
    }
    this.dragging = true;
    this.dragOffsetX = event.clientX - rect.left - x;
    this.dragOffsetY = event.clientY - rect.top - y;
  }

  onPointerMove(event: PointerEvent) {
    if (!this.dragging || !this.previewCanvas) return;
    const imgEl = this.previewImg?.nativeElement ?? this.previewCanvas.nativeElement;
    const rect = imgEl.getBoundingClientRect();

    // Position in CSS pixels within the rendered image
    let cssX = event.clientX - rect.left - this.dragOffsetX;
    let cssY = event.clientY - rect.top - this.dragOffsetY;
    cssX = Math.max(0, Math.min(cssX, rect.width));
    cssY = Math.max(0, Math.min(cssY, rect.height));

    // Convert to actual image pixel coordinates for the backend
    this.form.patchValue(
      { positionX: Math.round(cssX * this.scaleX), positionY: Math.round(cssY * this.scaleY) },
      { emitEvent: true }
    );
  }

  endDrag(event: PointerEvent) {
    if (!this.dragging) return;
    this.dragging = false;
  }

  // Build options from form for API
  private buildOptions(forDownload = false): WatermarkOptions {
    const v = this.form.value;
    const opts: WatermarkOptions = {
      mode: v.mode,
      opacity: Number(v.opacity ?? 1),
      scale: Number(v.scale ?? 1),
      margin: Number(v.margin ?? 0),
      rotate: Number(v.rotate ?? 0),
      tile: !!v.tile,
      gap: Number(v.gap ?? 0),
      text: v.text,
      fontSize: v.fontSize,
      fontFamily: v.fontFamily,
      color: v.color,
      strokeColor: v.strokeColor,
      strokeWidth: v.strokeWidth,
      download: forDownload,
    };
    if (v.positionMode === 'absolute') {
      opts.position = `${v.positionX ?? 0},${v.positionY ?? 0}`;
    } else {
      opts.anchor = (v.anchor as WatermarkAnchor) ?? 'bottom-right';
    }
    return opts;
  }

  updatePreview(): void {
    if (!this.mainFile) {
      this.errorMsg = 'Please upload a main image first.';
      return;
    }
    this.errorMsg = null;
    this.loading = true;
    this.cleanupObjectUrl('previewUrl');

    const opts = this.buildOptions(false);
    const logo =
      this.form.value.mode === 'logo' ? this.logoFile ?? undefined : undefined;
    this.svc.apply(this.mainFile, opts, logo).subscribe({
      next: (blob) => {
        this.previewUrl = URL.createObjectURL(blob);
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = err?.message || 'Preview generation failed.';
        this.loading = false;
      },
    });
  }

  download(): void {
    if (!this.mainFile) return;
    this.errorMsg = null;
    const opts = this.buildOptions(true);
    const logo =
      this.form.value.mode === 'logo' ? this.logoFile ?? undefined : undefined;
    this.loading = true;
    this.svc.apply(this.mainFile, opts, logo).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const name = `watermarked-${this.mainFile?.name || 'image'}`;
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = err?.message || 'Download failed.';
        this.loading = false;
      },
    });
  }
}
