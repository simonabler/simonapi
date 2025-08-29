import QRCode from 'qrcode';
import { Injectable, BadRequestException } from '@nestjs/common';
import { GenerateQrDto } from './dto/generate-qr.dto';
import { QrDataType, QrFormat, QrPayload, WifiPayload, VCardPayload, EmailPayload, SmsPayload, PhonePayload, UrlPayload, TextPayload } from './types';


@Injectable()
export class QrService {
  private payloadToText(type: QrDataType, payload: QrPayload): string {
    switch (type) {
      case QrDataType.URL: {
        const { url } = payload as UrlPayload;
        if (!url) throw new BadRequestException('url required');
        return url.trim();
      }
      case QrDataType.TEXT: {
        const { text } = payload as TextPayload;
        if (!text) throw new BadRequestException('text required');
        return text;
      }
      case QrDataType.EMAIL: {
        const { to, subject, body } = payload as EmailPayload;
        if (!to) throw new BadRequestException('to required');
        const qp = new URLSearchParams();
        if (subject) qp.set('subject', subject);
        if (body) qp.set('body', body);
        const query = qp.toString();
        return query ? `mailto:${to}?${query}` : `mailto:${to}`;
      }
      case QrDataType.PHONE: {
        const { number } = payload as PhonePayload;
        if (!number) throw new BadRequestException('number required');
        return `tel:${number}`;
      }
      case QrDataType.SMS: {
        const { number, message } = payload as SmsPayload;
        if (!number) throw new BadRequestException('number required');
        // SMSTO Syntax wird breit unterstützt
        return message ? `SMSTO:${number}:${message}` : `SMSTO:${number}`;
      }
      case QrDataType.VCARD: {
        const v = payload as VCardPayload;
        const lines: string[] = [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `N:${v.lastName || ''};${v.firstName || ''};;;`,
          `FN:${[v.firstName, v.lastName].filter(Boolean).join(' ')}`,
        ];
        if (v.organization) lines.push(`ORG:${v.organization}`);
        if (v.title) lines.push(`TITLE:${v.title}`);
        if (v.phone) lines.push(`TEL;TYPE=CELL:${v.phone}`);
        if (v.email) lines.push(`EMAIL:${v.email}`);
        if (v.website) lines.push(`URL:${v.website}`);
        if (v.address) lines.push(`ADR;TYPE=WORK:;;${v.address};;;;`);
        if (v.note) lines.push(`NOTE:${v.note}`);
        lines.push('END:VCARD');
        return lines.join('\n');
      }
      case QrDataType.WIFI: {
        const { ssid, password, hidden, encryption } = payload as WifiPayload;
        if (!ssid) throw new BadRequestException('ssid required');
        const T = encryption || (password ? 'WPA' : 'nopass');
        const H = hidden ? 'true' : 'false';
        const P = password ? `P:${password};` : '';
        return `WIFI:T:${T};S:${ssid};${P}H:${H};;`;
      }
      default:
        throw new BadRequestException('Unsupported type');
    }
  }


  async generate(dto: GenerateQrDto): Promise<{ format: QrFormat; body: Buffer | string; mime: string }> {
    const text = this.payloadToText(dto.type, dto.payload as any);
    const size = dto.size ?? 512;
    const margin = dto.margin ?? 2;
    const ecc = dto.ecc ?? 'M';
    const format: QrFormat = dto.format ?? 'svg';


    if (format === 'png') {
      const buf = await QRCode.toBuffer(text, {
        type: 'png',
        errorCorrectionLevel: ecc,
        width: size,
        margin,
        // scale wird intern aus width berechnet
      });
      return { format, body: buf, mime: 'image/png' };
    }


    // SVG
    const svg = await QRCode.toString(text, {
      type: 'svg',
      errorCorrectionLevel: ecc,
      width: size,
      margin,
    });
    return { format: 'svg', body: svg, mime: 'image/svg+xml' };
  }
}