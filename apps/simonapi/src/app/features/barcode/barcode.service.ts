import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../../environments/environments';
import {
  AiSpecJson,
  BarcodeRequest,
  DigitalLinkDecodeRequest,
  DigitalLinkEncodeRequest,
  DigitalLinkEncodeResult,
  Gs1BatchRequest,
  Gs1BatchResultItem,
  Gs1Item,
  Gs1Request,
  SsccBuildRequest,
  SsccAutoRequest,
  SsccValidateRequest,
  SsccValidateResult,
  SsccPrefixInfo,
  SsccCounterState,
} from './models';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class BarcodeService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  isBrowser = false;
  private API: string;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.API = (environment.API_BASE_URL || window.origin) + '/api';
  }

  // ---------------------------------------------------------------------------
  // Standard barcodes
  // ---------------------------------------------------------------------------

  private buildParams(req: BarcodeRequest): HttpParams {
    let p = new HttpParams().set('type', req.type).set('text', req.text);
    if (req.includetext) p = p.set('includetext', String(req.includetext));
    if (req.scale)       p = p.set('scale', String(req.scale));
    if (req.height)      p = p.set('height', String(req.height));
    return p;
  }

  preview$(req: BarcodeRequest): Observable<Blob> {
    return this.http.get(`${this.API}/barcode/png`, {
      params: this.buildParams(req),
      responseType: 'blob',
    });
  }

  async download(req: BarcodeRequest, format: 'png' | 'svg'): Promise<void> {
    const params = this.buildParams(req);
    if (format === 'png') {
      const blob = await firstValueFrom(
        this.http.get(`${this.API}/barcode/png`, { params, responseType: 'blob' })
      );
      this.triggerDownload(blob, `barcode-${req.type}.png`);
      return;
    }
    const svgText = await firstValueFrom(
      this.http.get(`${this.API}/barcode/svg`, { params, responseType: 'text' })
    );
    this.triggerDownload(new Blob([svgText], { type: 'image/svg+xml' }), `barcode-${req.type}.svg`);
  }

  // ---------------------------------------------------------------------------
  // GS1 — single render
  // Uses gs1/render (recommended) instead of the deprecated gs1/png endpoint.
  // ---------------------------------------------------------------------------

  /** Live preview for the GS1 editor — always returns a PNG blob. */
  previewGs1$(req: Gs1Request): Observable<Blob> {
    return this.http.post(`${this.API}/barcode/gs1/render`, { ...req, format: 'png' }, {
      responseType: 'blob',
    });
  }

  getGs1Registry$(): Observable<Record<string, AiSpecJson>> {
    return this.http.get<Record<string, AiSpecJson>>(`${this.API}/barcode/gs1/registry`);
  }

  async downloadGs1(req: Gs1Request, format: 'png' | 'svg'): Promise<void> {
    const body = { ...req, format };
    if (format === 'png') {
      const blob = await firstValueFrom(
        this.http.post(`${this.API}/barcode/gs1/render`, body, { responseType: 'blob' })
      );
      this.triggerDownload(blob, `gs1-${req.symbology}.png`);
      return;
    }
    const svgText = await firstValueFrom(
      this.http.post(`${this.API}/barcode/gs1/render`, body, { responseType: 'text' })
    );
    this.triggerDownload(new Blob([svgText], { type: 'image/svg+xml' }), `gs1-${req.symbology}.svg`);
  }

  // ---------------------------------------------------------------------------
  // GS1 — batch render
  // ---------------------------------------------------------------------------

  /**
   * Batch-render up to 100 GS1 barcodes in a single request.
   * Each item in the response carries `data` (Base64 PNG or SVG string) on
   * success, or `error` + `errorCode` on per-item failure.
   */
  gs1Batch$(req: Gs1BatchRequest): Observable<Gs1BatchResultItem[]> {
    return this.http.post<Gs1BatchResultItem[]>(`${this.API}/barcode/gs1/batch`, req);
  }

  // ---------------------------------------------------------------------------
  // GS1 Digital Link
  // ---------------------------------------------------------------------------

  /** Convert AI items to a GS1 Digital Link URL. */
  digitalLinkEncode$(req: DigitalLinkEncodeRequest): Observable<DigitalLinkEncodeResult> {
    return this.http.post<DigitalLinkEncodeResult>(
      `${this.API}/barcode/gs1/digital-link/encode`, req
    );
  }

  /** Parse a GS1 Digital Link URL back into AI items. */
  digitalLinkDecode$(req: DigitalLinkDecodeRequest): Observable<Gs1Item[]> {
    return this.http.post<Gs1Item[]>(
      `${this.API}/barcode/gs1/digital-link/decode`, req
    );
  }

  // ---------------------------------------------------------------------------
  // Shared helper
  // ---------------------------------------------------------------------------

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------------------------------------------------------------------------
  // SSCC
  // ---------------------------------------------------------------------------

  ssccBuild$(req: SsccBuildRequest): Observable<Blob> {
    return this.http.post(`${this.API}/barcode/sscc/build`, req, { responseType: 'blob' });
  }

  ssccAuto$(req: SsccAutoRequest): Observable<Blob> {
    return this.http.post(`${this.API}/barcode/sscc/auto`, req, { responseType: 'blob' });
  }

  ssccValidate$(req: SsccValidateRequest): Observable<SsccValidateResult> {
    return this.http.post<SsccValidateResult>(`${this.API}/barcode/sscc/validate`, req);
  }

  ssccRender$(sscc: string, format: 'png' | 'svg' = 'png'): Observable<Blob> {
    return this.http.post(`${this.API}/barcode/sscc/render`, { sscc, format }, { responseType: 'blob' });
  }

  ssccPrefixInfo$(prefix: string): Observable<SsccPrefixInfo> {
    return this.http.get<SsccPrefixInfo>(`${this.API}/barcode/sscc/prefix-info`, { params: { prefix } });
  }

  ssccCounter$(extensionDigit: number, companyPrefix: string): Observable<SsccCounterState> {
    return this.http.get<SsccCounterState>(`${this.API}/barcode/sscc/counter`, {
      params: { extensionDigit: String(extensionDigit), companyPrefix },
    });
  }
}
