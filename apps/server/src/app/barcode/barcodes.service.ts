import { BadRequestException, Injectable } from '@nestjs/common';
import bwipjs from 'bwip-js';
import { buildGs1Text } from './gs1-validate';
import { StandardBarcodeType } from './dto/generate-barcode.dto';

@Injectable()
export class BarcodesService {
  toPng(params: {
    type: StandardBarcodeType;
    text: string;
    includetext?: boolean;
    scale?: number;
    height?: number;
  }): Promise<Buffer> {
    try {
      const { type, text, includetext = false, scale = 3, height } = params;
      const opts: any = {
        bcid: type,
        text,
        includetext,
        scale,
      };
      if (height) opts.height = height;
      return bwipjs.toBuffer(opts);
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Barcode rendering failed');
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
      const opts: any = {
        bcid: type,
        text,
        includetext,
        scale,
      };
      if (height) opts.height = height;
      return bwipjs.toSVG(opts);
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Barcode rendering failed');
    }
  }

  buildGs1Text(items: Array<{ ai: string; value: string }>): string {
    try {
      return buildGs1Text(items);
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'GS1 validation failed');
    }
  }

  async gs1ToPng(params: {
    symbology: 'gs1-128' | 'gs1datamatrix';
    items: Array<{ ai: string; value: string }>;
    includetext?: boolean;
    scale?: number;
    height?: number;
  }): Promise<Buffer> {
    const text = this.buildGs1Text(params.items);
    try {
      const { symbology, includetext = false, scale = 3, height } = params;
      const opts: any = { bcid: symbology, text, parse: true, includetext, scale };
      if (height) opts.height = height;
      const buf = await bwipjs.toBuffer(opts);
      return buf as Buffer;
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'GS1 rendering failed');
    }
  }

  gs1ToSvg(params: {
    symbology: 'gs1-128' | 'gs1datamatrix';
    items: Array<{ ai: string; value: string }>;
    includetext?: boolean;
    scale?: number;
    height?: number;
  }): string {
    const text = this.buildGs1Text(params.items);
    try {
      const { symbology, includetext = false, scale = 3, height } = params;
      const opts: any = { bcid: symbology, text, parse: true, includetext, scale };
      if (height) opts.height = height;
      return bwipjs.toSVG(opts);
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'GS1 rendering failed');
    }
  }
}
