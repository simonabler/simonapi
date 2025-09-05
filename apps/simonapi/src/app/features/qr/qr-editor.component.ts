import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { QrService } from './qr-editor.sevice';
import { GenerateRequest, QrDataType, QrPreset } from './models';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil, catchError } from 'rxjs/operators';
import { Subject, EMPTY } from 'rxjs';
import { LucideAngularModule, QrCodeIcon } from 'lucide-angular';


@Component({
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  selector: 'app-qr-editor',
  templateUrl: './qr-editor.component.html',
  styleUrls: ['./qr-editor.component.scss']
})
export class QrEditorComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private api = inject(QrService);

  readonly QrCodeIcon = QrCodeIcon;


  svgPreview: string | null = null;
  presets: QrPreset[] = [];
  saving = false;
  previewUrl: string | null = null;
  loading = false;

  private destroy$ = new Subject<void>();


  form = this.fb.group({
    type: this.fb.control<QrDataType>('url', { nonNullable: true }),
    options: this.fb.group({
      size: [512, [Validators.min(64), Validators.max(4096)]],
      margin: [2, [Validators.min(0), Validators.max(20)]],
      ecc: ['M'],
    }),


    // shared fields per type
    url: [''],
    text: [''],
    email_to: [''], email_subject: [''], email_body: [''],
    phone_number: [''],
    sms_number: [''], sms_message: [''],
    v_firstName: [''], v_lastName: [''], v_org: [''], v_title: [''], v_phone: [''], v_email: [''], v_website: [''], v_address: [''], v_note: [''],
    wifi_ssid: [''], wifi_password: [''], wifi_hidden: [false], wifi_encryption: ['WPA'],


    presetName: [''],
  });



  ngOnInit() {

    // Debounced Live-Preview
    this.form.valueChanges.pipe(
      startWith(this.form.getRawValue()),               // initiale Preview
      map(() => this.buildPayload()),
      // einfache Deep-Comparison; reicht hier aus
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      debounceTime(400),
      switchMap(req => {
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
      this.previewUrl = URL.createObjectURL(blob);
      this.loading = false;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.revokePreview();
  }


  private buildPayload(): GenerateRequest {
    const v = this.form.getRawValue();
    const type = v.type;
    let payload: Record<string, any> = {};
    switch (type) {
      case 'url': payload = { url: v.url }; break;
      case 'text': payload = { text: v.text }; break;
      case 'email': payload = { to: v.email_to, subject: v.email_subject, body: v.email_body }; break;
      case 'phone': payload = { number: v.phone_number }; break;
      case 'sms': payload = { number: v.sms_number, message: v.sms_message }; break;
      case 'vcard': payload = { firstName: v.v_firstName, lastName: v.v_lastName, organization: v.v_org, title: v.v_title, phone: v.v_phone, email: v.v_email, website: v.v_website, address: v.v_address, note: v.v_note }; break;
      case 'wifi': payload = { ssid: v.wifi_ssid, password: v.wifi_password, hidden: v.wifi_hidden, encryption: v.wifi_encryption }; break;
    }
    const opts = this.form.controls.options.getRawValue();
    return { type, payload, format: 'svg', size: opts.size!, margin: opts.margin!, ecc: opts.ecc as any };
  }



  private revokePreview() {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
  }


  async download(format: 'png' | 'svg') {
    const req = { ...this.buildPayload(), format } as GenerateRequest & { format: 'png' | 'svg' };
    await this.api.download(req);
  }


}