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
