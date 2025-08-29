import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { QrService } from './qr-editor.sevice';
import { GenerateRequest, QrDataType, QrPreset } from './models';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil, catchError } from 'rxjs/operators';
import { Subject, EMPTY } from 'rxjs';


@Component({
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-qr-editor',
  templateUrl: './qr-editor.component.html',
  styleUrls: ['./qr-editor.component.scss']
})
export class QrEditorComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private api = inject(QrService);


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
    this.reloadPresets();

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


  async savePreset() {
    const name = this.form.value.presetName?.trim();
    if (!name) return;
    this.saving = true;
    const req = this.buildPayload();
    await this.api.createPreset({ name, type: req.type, payload: req.payload });
    this.form.patchValue({ presetName: '' });
  }

  async applyPreset(p: QrPreset) {
    this.form.patchValue({ type: p.type });
    switch (p.type) {
      case 'url': this.form.patchValue({ url: p.payload['url'] }); break;
      case 'text': this.form.patchValue({ text: p.payload['text'] }); break;
      case 'email': this.form.patchValue({ email_to: p.payload['to'], email_subject: p.payload['subject'], email_body: p.payload['body'] }); break;
      case 'phone': this.form.patchValue({ phone_number: p.payload['number'] }); break;
      case 'sms': this.form.patchValue({ sms_number: p.payload['number'], sms_message: p.payload['message'] }); break;
      case 'vcard': this.form.patchValue({ v_firstName: p.payload['firstName'], v_lastName: p.payload['lastName'], v_org: p.payload['organization'], v_title: p.payload['title'], v_phone: p.payload['phone'], v_email: p.payload['email'], v_website: p.payload['website'], v_address: p.payload['address'], v_note: p.payload['note'] }); break;
      case 'wifi': this.form.patchValue({ wifi_ssid: p.payload['ssid'], wifi_password: p.payload['password'], wifi_hidden: p.payload['hidden'], wifi_encryption: p.payload['encryption'] }); break;
    }
  }


  async deletePreset(p: QrPreset) { await this.api.deletePreset(p.id); await this.reloadPresets(); }
  async reloadPresets() { this.presets = await this.api.listPresets(); }
}