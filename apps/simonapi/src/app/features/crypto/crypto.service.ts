import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';

function apiBase(): string {
  return (environment.API_BASE_URL || (typeof window !== 'undefined' ? window.origin : '')) + '/api';
}

import {
  TotpSetupRequest, TotpSetupResult,
  TotpVerifyRequest, TotpVerifyResult,
  TotpGenerateRequest, TotpGenerateResult,
  CryptoHashRequest, CryptoHashResult,
  HmacRequest, HmacResult,
  Ed25519KeypairResult, Ed25519SignRequest, Ed25519SignResult,
  Ed25519VerifyRequest, Ed25519VerifyResult,
  JwtKeypairRequest, JwtKeypairResult,
  JwtEncodeRequest, JwtEncodeResult,
  JwtDecodeRequest, JwtDecodeResult,
  JwtVerifyRequest, JwtVerifyResult,
} from './models';

@Injectable({ providedIn: 'root' })
export class CryptoApiService {
  private readonly http = inject(HttpClient);
  private get base() { return `${apiBase()}/crypto`; }

  // TOTP
  totpSetup$(dto: TotpSetupRequest):    Observable<TotpSetupResult>    { return this.http.post<TotpSetupResult>(`${this.base}/totp/setup`, dto); }
  totpVerify$(dto: TotpVerifyRequest):  Observable<TotpVerifyResult>   { return this.http.post<TotpVerifyResult>(`${this.base}/totp/verify`, dto); }
  totpGenerate$(dto: TotpGenerateRequest): Observable<TotpGenerateResult> { return this.http.post<TotpGenerateResult>(`${this.base}/totp/generate`, dto); }

  // Hash & HMAC
  hash$(dto: CryptoHashRequest):  Observable<CryptoHashResult> { return this.http.post<CryptoHashResult>(`${this.base}/hash`, dto); }
  hmac$(dto: HmacRequest):        Observable<HmacResult>       { return this.http.post<HmacResult>(`${this.base}/hmac`, dto); }

  // Ed25519
  ed25519Keypair$():                                  Observable<Ed25519KeypairResult>  { return this.http.post<Ed25519KeypairResult>(`${this.base}/ed25519/keypair`, {}); }
  ed25519Sign$(dto: Ed25519SignRequest):               Observable<Ed25519SignResult>     { return this.http.post<Ed25519SignResult>(`${this.base}/ed25519/sign`, dto); }
  ed25519Verify$(dto: Ed25519VerifyRequest):           Observable<Ed25519VerifyResult>  { return this.http.post<Ed25519VerifyResult>(`${this.base}/ed25519/verify`, dto); }

  // JWT
  jwtKeypair$(dto: JwtKeypairRequest): Observable<JwtKeypairResult> { return this.http.post<JwtKeypairResult>(`${this.base}/jwt/keypair`, dto); }
  jwtEncode$(dto: JwtEncodeRequest):   Observable<JwtEncodeResult>  { return this.http.post<JwtEncodeResult>(`${this.base}/jwt/encode`, dto); }
  jwtDecode$(dto: JwtDecodeRequest):   Observable<JwtDecodeResult>  { return this.http.post<JwtDecodeResult>(`${this.base}/jwt/decode`, dto); }
  jwtVerify$(dto: JwtVerifyRequest):   Observable<JwtVerifyResult>  { return this.http.post<JwtVerifyResult>(`${this.base}/jwt/verify`, dto); }
}
