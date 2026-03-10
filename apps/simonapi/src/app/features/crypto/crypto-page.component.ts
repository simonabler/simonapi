import { Component, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { CryptoApiService } from './crypto.service';
import {
  TotpSetupResult, TotpVerifyResult, TotpGenerateResult,
  CryptoHashResult, HmacResult,
  Ed25519KeypairResult, Ed25519SignResult, Ed25519VerifyResult,
  JwtKeypairResult, JwtEncodeResult, JwtDecodeResult, JwtVerifyResult,
} from './models';

type MainTab = 'totp' | 'hash' | 'ed25519' | 'jwt';
type TotpTab = 'setup' | 'verify' | 'generate';
type HashTab = 'hash' | 'hmac';
type Ed25519Tab = 'keypair' | 'sign' | 'verify';
type JwtTab = 'keypair' | 'encode' | 'decode' | 'verify';

@Component({
  standalone: true,
  selector: 'app-crypto-page',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './crypto-page.component.html',
})
export class CryptoPageComponent implements OnDestroy {
  private fb        = inject(FormBuilder);
  private api       = inject(CryptoApiService);
  private sanitizer = inject(DomSanitizer);
  private destroy$  = new Subject<void>();

  // ── Tabs ──────────────────────────────────────────────────────────────────
  mainTab:    MainTab    = 'totp';
  totpTab:    TotpTab    = 'setup';
  hashTab:    HashTab    = 'hash';
  ed25519Tab: Ed25519Tab = 'keypair';
  jwtTab:     JwtTab     = 'keypair';

  // ── Loading ───────────────────────────────────────────────────────────────
  loading = signal(false);

  // ── Copied state ──────────────────────────────────────────────────────────
  copiedKey = signal<string | null>(null);

  // ── Safe SVG for QR code (bypasses Angular's HTML sanitizer) ─────────────
  // Angular strips SVG content from [innerHTML] by default for security.
  // Since the SVG is generated server-side from a known-safe otpauth:// URI,
  // it is safe to bypass sanitization here.
  get safeQrSvg(): SafeHtml | null {
    if (!this.totpSetupResult?.qrCode || this.totpSetupResult.qrFormat !== 'svg') return null;
    return this.sanitizer.bypassSecurityTrustHtml(this.totpSetupResult.qrCode);
  }

  copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.copiedKey.set(key);
      setTimeout(() => this.copiedKey.set(null), 2000);
    });
  }

  // ── TOTP Setup ────────────────────────────────────────────────────────────
  totpSetupForm = this.fb.group({
    issuer:      ['Simon API Hub'],
    accountName: ['simon@example.com', Validators.required],
    algorithm:   ['SHA1'],
    digits:      [6],
    period:      [30],
    qrFormat:    ['svg'],
  });
  totpSetupResult: TotpSetupResult | null = null;
  totpSetupError = '';

  totpCountdown(): number {
    const period = this.totpSetupResult?.period ?? 30;
    return period - (Math.floor(Date.now() / 1000) % period);
  }

  submitTotpSetup() {
    if (this.totpSetupForm.invalid) return;
    this.totpSetupError = '';
    this.totpSetupResult = null;
    this.loading.set(true);
    const v = this.totpSetupForm.value;
    this.api.totpSetup$({
      issuer:      v.issuer || undefined,
      accountName: v.accountName!,
      algorithm:   (v.algorithm as any) || undefined,
      digits:      (v.digits as any) || undefined,
      period:      (v.period as any) || undefined,
      qrFormat:    (v.qrFormat as any) || undefined,
    }).pipe(takeUntil(this.destroy$), finalize(() => this.loading.set(false)))
      .subscribe({ next: r => this.totpSetupResult = r, error: e => this.totpSetupError = e.error?.message ?? 'Error' });
  }

  // ── TOTP Verify ───────────────────────────────────────────────────────────
  totpVerifyForm = this.fb.group({
    secret: ['', Validators.required],
    token:  ['', [Validators.required, Validators.minLength(6), Validators.maxLength(8)]],
    window: [1],
  });
  totpVerifyResult: TotpVerifyResult | null = null;
  totpVerifyError = '';

  submitTotpVerify() {
    if (this.totpVerifyForm.invalid) return;
    this.totpVerifyError = '';
    this.totpVerifyResult = null;
    this.loading.set(true);
    const v = this.totpVerifyForm.value;
    this.api.totpVerify$({ secret: v.secret!, token: v.token!, window: v.window ?? 1 })
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading.set(false)))
      .subscribe({ next: r => this.totpVerifyResult = r, error: e => this.totpVerifyError = e.error?.message ?? 'Error' });
  }

  // ── TOTP Generate ─────────────────────────────────────────────────────────
  totpGenerateForm = this.fb.group({
    secret: ['', Validators.required],
    period: [30],
    digits: [6],
  });
  totpGenerateResult: TotpGenerateResult | null = null;
  totpGenerateError = '';

  submitTotpGenerate() {
    if (this.totpGenerateForm.invalid) return;
    this.totpGenerateError = '';
    this.totpGenerateResult = null;
    this.loading.set(true);
    const v = this.totpGenerateForm.value;
    this.api.totpGenerate$({ secret: v.secret!, period: (v.period as any), digits: (v.digits as any) })
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading.set(false)))
      .subscribe({ next: r => this.totpGenerateResult = r, error: e => this.totpGenerateError = e.error?.message ?? 'Error' });
  }

  // ── Hash ──────────────────────────────────────────────────────────────────
  hashForm = this.fb.group({
    data:       ['hello world', Validators.required],
    algo:       ['sha256'],
    saltRounds: [10],
  });
  hashResult: CryptoHashResult | null = null;
  hashError = '';

  get showSaltRounds() { return this.hashForm.get('algo')?.value === 'bcrypt'; }

  submitHash() {
    if (this.hashForm.invalid) return;
    this.hashError = '';
    this.hashResult = null;
    this.loading.set(true);
    const v = this.hashForm.value;
    this.api.hash$({ data: v.data!, algo: v.algo as any, saltRounds: v.saltRounds ?? undefined })
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading.set(false)))
      .subscribe({ next: r => this.hashResult = r, error: e => this.hashError = e.error?.message ?? 'Error' });
  }

  // ── HMAC ──────────────────────────────────────────────────────────────────
  hmacForm = this.fb.group({
    data:      ['Hello World', Validators.required],
    key:       ['my-secret-key', Validators.required],
    algorithm: ['sha256'],
    encoding:  ['hex'],
  });
  hmacResult: HmacResult | null = null;
  hmacError = '';

  submitHmac() {
    if (this.hmacForm.invalid) return;
    this.hmacError = '';
    this.hmacResult = null;
    this.loading.set(true);
    const v = this.hmacForm.value;
    this.api.hmac$({ data: v.data!, key: v.key!, algorithm: v.algorithm ?? undefined, encoding: v.encoding ?? undefined })
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading.set(false)))
      .subscribe({ next: r => this.hmacResult = r, error: e => this.hmacError = e.error?.message ?? 'Error' });
  }

  // ── Ed25519 Keypair ───────────────────────────────────────────────────────
  ed25519KeypairResult: Ed25519KeypairResult | null = null;
  ed25519KeypairError = '';

  generateEd25519Keypair() {
    this.ed25519KeypairError = '';
    this.ed25519KeypairResult = null;
    this.loading.set(true);
    this.api.ed25519Keypair$()
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading.set(false)))
      .subscribe({ next: r => this.ed25519KeypairResult = r, error: e => this.ed25519KeypairError = e.error?.message ?? 'Error' });
  }

  // ── Ed25519 Sign ──────────────────────────────────────────────────────────
  ed25519SignForm = this.fb.group({
    message:    ['data to sign', Validators.required],
    privateKey: ['', Validators.required],
    encoding:   ['hex'],
  });
  ed25519SignResult: Ed25519SignResult | null = null;
  ed25519SignError = '';

  submitEd25519Sign() {
    if (this.ed25519SignForm.invalid) return;
    this.ed25519SignError = '';
    this.ed25519SignResult = null;
    this.loading.set(true);
    const v = this.ed25519SignForm.value;
    this.api.ed25519Sign$({ message: v.message!, privateKey: v.privateKey!, encoding: v.encoding ?? undefined })
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading.set(false)))
      .subscribe({ next: r => this.ed25519SignResult = r, error: e => this.ed25519SignError = e.error?.message ?? 'Error' });
  }

  // ── Ed25519 Verify ────────────────────────────────────────────────────────
  ed25519VerifyForm = this.fb.group({
    message:   ['data to sign', Validators.required],
    signature: ['', Validators.required],
    publicKey: ['', Validators.required],
    encoding:  ['hex'],
  });
  ed25519VerifyResult: Ed25519VerifyResult | null = null;
  ed25519VerifyError = '';

  submitEd25519Verify() {
    if (this.ed25519VerifyForm.invalid) return;
    this.ed25519VerifyError = '';
    this.ed25519VerifyResult = null;
    this.loading.set(true);
    const v = this.ed25519VerifyForm.value;
    this.api.ed25519Verify$({ message: v.message!, signature: v.signature!, publicKey: v.publicKey!, encoding: v.encoding ?? undefined })
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading.set(false)))
      .subscribe({ next: r => this.ed25519VerifyResult = r, error: e => this.ed25519VerifyError = e.error?.message ?? 'Error' });
  }

  // ── JWT Keypair ───────────────────────────────────────────────────────────
  jwtKeypairAlgo: 'RS256' | 'ES256' | 'EdDSA' = 'RS256';
  jwtKeypairResult: JwtKeypairResult | null = null;
  jwtKeypairError = '';

  generateJwtKeypair() {
    this.jwtKeypairError = '';
    this.jwtKeypairResult = null;
    this.loading.set(true);
    this.api.jwtKeypair$({ algorithm: this.jwtKeypairAlgo })
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading.set(false)))
      .subscribe({ next: r => this.jwtKeypairResult = r, error: e => this.jwtKeypairError = e.error?.message ?? 'Error' });
  }

  // ── JWT Encode ────────────────────────────────────────────────────────────
  jwtEncodeForm = this.fb.group({
    payload:    ['{\n  "sub": "1234",\n  "name": "Simon"\n}', Validators.required],
    algorithm:  ['HS256'],
    secret:     ['my-secret'],
    privateKey: [''],
    expiresIn:  ['1h'],
  });
  jwtEncodeResult: JwtEncodeResult | null = null;
  jwtEncodeError = '';
  jwtPayloadError = '';

  get jwtEncodeAlgo() { return this.jwtEncodeForm.get('algorithm')?.value ?? 'HS256'; }
  get jwtEncodeIsSymmetric() { return this.jwtEncodeAlgo === 'HS256' || this.jwtEncodeAlgo === 'HS512'; }

  submitJwtEncode() {
    if (this.jwtEncodeForm.invalid) return;
    this.jwtEncodeError = '';
    this.jwtPayloadError = '';
    this.jwtEncodeResult = null;
    const v = this.jwtEncodeForm.value;
    let payload: Record<string, unknown>;
    try { payload = JSON.parse(v.payload!); } catch { this.jwtPayloadError = 'Invalid JSON payload'; return; }
    this.loading.set(true);
    this.api.jwtEncode$({
      payload,
      algorithm: v.algorithm!,
      secret:     this.jwtEncodeIsSymmetric ? v.secret || undefined : undefined,
      privateKey: !this.jwtEncodeIsSymmetric ? v.privateKey || undefined : undefined,
      expiresIn:  v.expiresIn || undefined,
    }).pipe(takeUntil(this.destroy$), finalize(() => this.loading.set(false)))
      .subscribe({ next: r => this.jwtEncodeResult = r, error: e => this.jwtEncodeError = e.error?.message ?? 'Error' });
  }

  // ── JWT Decode ────────────────────────────────────────────────────────────
  jwtDecodeForm = this.fb.group({ token: ['', Validators.required] });
  jwtDecodeResult: JwtDecodeResult | null = null;
  jwtDecodeError = '';

  submitJwtDecode() {
    if (this.jwtDecodeForm.invalid) return;
    this.jwtDecodeError = '';
    this.jwtDecodeResult = null;
    this.loading.set(true);
    this.api.jwtDecode$({ token: this.jwtDecodeForm.value.token! })
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading.set(false)))
      .subscribe({ next: r => this.jwtDecodeResult = r, error: e => this.jwtDecodeError = e.error?.message ?? 'Error' });
  }

  // ── JWT Verify ────────────────────────────────────────────────────────────
  jwtVerifyForm = this.fb.group({
    token:     ['', Validators.required],
    algorithm: ['HS256'],
    secret:    ['my-secret'],
    publicKey: [''],
  });
  jwtVerifyResult: JwtVerifyResult | null = null;
  jwtVerifyError = '';

  get jwtVerifyAlgo() { return this.jwtVerifyForm.get('algorithm')?.value ?? 'HS256'; }
  get jwtVerifyIsSymmetric() { return this.jwtVerifyAlgo === 'HS256' || this.jwtVerifyAlgo === 'HS512'; }

  submitJwtVerify() {
    if (this.jwtVerifyForm.invalid) return;
    this.jwtVerifyError = '';
    this.jwtVerifyResult = null;
    this.loading.set(true);
    const v = this.jwtVerifyForm.value;
    this.api.jwtVerify$({
      token:     v.token!,
      algorithm: v.algorithm!,
      secret:    this.jwtVerifyIsSymmetric ? v.secret || undefined : undefined,
      publicKey: !this.jwtVerifyIsSymmetric ? v.publicKey || undefined : undefined,
    }).pipe(takeUntil(this.destroy$), finalize(() => this.loading.set(false)))
      .subscribe({ next: r => this.jwtVerifyResult = r, error: e => this.jwtVerifyError = e.error?.message ?? 'Error' });
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
