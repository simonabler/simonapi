import { BadRequestException, Injectable } from '@nestjs/common';
import bwipjs from 'bwip-js';
import { buildGs1Text } from './gs1-validate';
import { StandardBarcodeType } from './dto/generate-barcode.dto';
import { classifyGs1Error, gs1ErrorBody } from './gs1-error';
import { GenerateGs1BatchDto, Gs1BatchResultItem } from './dto/generate-gs1-batch.dto';

type Gs1Params = {
  symbology: 'gs1-128' | 'gs1datamatrix';
  items: Array<{ ai: string; value: string }>;
  includetext?: boolean;
  scale?: number;
  height?: number;
};

@Injectable()
export class BarcodesService {

  // ---------------------------------------------------------------------------
  // Standard barcodes
  // ---------------------------------------------------------------------------

  toPng(params: {
    type: StandardBarcodeType;
    text: string;
    includetext?: boolean;
    scale?: number;
    height?: number;
  }): Promise<Buffer> {
    this.validateStandardText(params.type, params.text);
    try {
      const { type, text, includetext = false, scale = 3, height } = params;
      const opts: any = { bcid: type, text, includetext, scale };
      if (height) opts.height = height;
      return bwipjs.toBuffer(opts);
    } catch (e: any) {
      throw new BadRequestException(gs1ErrorBody([classifyGs1Error(e)]));
    }
  }

  toSvg(params: {
    type: StandardBarcodeType;
    text: string;
    includetext?: boolean;
    scale?: number;
    height?: number;
  }): string {
    try {
      const { type, text, includetext = false, scale = 3, height } = params;
      const opts: any = { bcid: type, text, includetext, scale };
      if (height) opts.height = height;
      return bwipjs.toSVG(opts);
    } catch (e: any) {
      throw new BadRequestException(gs1ErrorBody([classifyGs1Error(e)]));
    }
  }


  // ---------------------------------------------------------------------------
  // Standard barcode pre-validation (runs before bwip-js to give clear errors)
  // ---------------------------------------------------------------------------

  /**
   * Validates the text payload for standard barcode types that have strict
   * format requirements. Throws BadRequestException with a clear message so
   * the bwip-js opaque error never reaches the client.
   */
  private validateStandardText(type: StandardBarcodeType, text: string): void {
    const t = text.trim();

    switch (type) {
      case StandardBarcodeType.EAN13: {
        if (!/^\d{12,13}$/.test(t))
          throw new BadRequestException('EAN-13 requires 12 or 13 digits (check digit is optional — it will be verified).');
        if (t.length === 13 && !this.eanCheckDigitValid(t))
          throw new BadRequestException(`EAN-13 check digit is wrong. Expected ${this.eanCheckDigit(t.slice(0, 12))}, got ${t[12]}.`);
        break;
      }
      case StandardBarcodeType.EAN8: {
        if (!/^\d{7,8}$/.test(t))
          throw new BadRequestException('EAN-8 requires 7 or 8 digits (check digit is optional — it will be verified).');
        if (t.length === 8 && !this.eanCheckDigitValid(t))
          throw new BadRequestException(`EAN-8 check digit is wrong. Expected ${this.eanCheckDigit(t.slice(0, 7))}, got ${t[7]}.`);
        break;
      }
      case StandardBarcodeType.UPCA: {
        if (!/^\d{11,12}$/.test(t))
          throw new BadRequestException('UPC-A requires 11 or 12 digits (check digit is optional — it will be verified).');
        if (t.length === 12 && !this.eanCheckDigitValid(t))
          throw new BadRequestException(`UPC-A check digit is wrong. Expected ${this.eanCheckDigit(t.slice(0, 11))}, got ${t[11]}.`);
        break;
      }
      case StandardBarcodeType.ITF14: {
        if (!/^\d{13,14}$/.test(t))
          throw new BadRequestException('ITF-14 requires 13 or 14 digits.');
        break;
      }
      // CODE128, CODE39, PDF417, DATAMATRIX accept arbitrary content — bwip handles it
    }
  }

  /** Compute EAN/UPC check digit for a digit string (without check digit). */
  private eanCheckDigit(digits: string): string {
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      sum += parseInt(digits[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    return String((10 - (sum % 10)) % 10);
  }

  /** Verify that the last character is the correct EAN check digit. */
  private eanCheckDigitValid(full: string): boolean {
    return this.eanCheckDigit(full.slice(0, -1)) === full[full.length - 1];
  }

  // ---------------------------------------------------------------------------
  // GS1 — shared helpers
  // ---------------------------------------------------------------------------

  buildGs1Text(items: Array<{ ai: string; value: string }>): string {
    try {
      return buildGs1Text(items);
    } catch (e: any) {
      throw new BadRequestException(gs1ErrorBody([classifyGs1Error(e)]));
    }
  }

  // ---------------------------------------------------------------------------
  // GS1 — single render
  // ---------------------------------------------------------------------------

  async gs1ToPng(params: Gs1Params): Promise<Buffer> {
    const text = this.buildGs1Text(params.items);
    try {
      const { symbology, includetext = false, scale = 3, height } = params;
      const opts: any = { bcid: symbology, text, parse: true, includetext, scale };
      if (height) opts.height = height;
      return bwipjs.toBuffer(opts);
    } catch (e: any) {
      throw new BadRequestException(gs1ErrorBody([classifyGs1Error(e)]));
    }
  }

  gs1ToSvg(params: Gs1Params): string {
    const text = this.buildGs1Text(params.items);
    try {
      const { symbology, includetext = false, scale = 3, height } = params;
      const opts: any = { bcid: symbology, text, parse: true, includetext, scale };
      if (height) opts.height = height;
      return bwipjs.toSVG(opts);
    } catch (e: any) {
      throw new BadRequestException(gs1ErrorBody([classifyGs1Error(e)]));
    }
  }

  // ---------------------------------------------------------------------------
  // GS1 — batch render (Point 4)
  // Each item is rendered independently; failures are recorded per-item rather
  // than aborting the entire batch so callers can handle partial success.
  // ---------------------------------------------------------------------------

  async gs1Batch(dto: GenerateGs1BatchDto): Promise<Gs1BatchResultItem[]> {
    const { symbology, format, barcodes, includetext = false, scale = 3, height } = dto;
    const results: Gs1BatchResultItem[] = [];

    for (let idx = 0; idx < barcodes.length; idx++) {
      const entry = barcodes[idx];
      try {
        // Validate + normalize items — throws structured BadRequestException on failure
        const text = buildGs1Text(entry.items);
        const opts: any = { bcid: symbology, text, parse: true, includetext, scale };
        if (height) opts.height = height;

        if (format === 'png') {
          const buf: Buffer = await bwipjs.toBuffer(opts);
          results.push({
            index: idx,
            ref: entry.ref,
            data: buf.toString('base64'),
            mimeType: 'image/png',
          });
        } else {
          const svg: string = bwipjs.toSVG(opts);
          results.push({
            index: idx,
            ref: entry.ref,
            data: svg,
            mimeType: 'image/svg+xml',
          });
        }
      } catch (e: any) {
        const detail = classifyGs1Error(e);
        results.push({
          index: idx,
          ref: entry.ref,
          error: detail.message,
          errorCode: detail.code,
        });
      }
    }

    return results;
  }
}
