import { BadRequestException, Injectable } from '@nestjs/common';
import * as Sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import { ApplyWatermarkDto, WatermarkMode, WatermarkAnchor } from './dto/apply-watermark.dto';

export type ApplyArgs = {
  inputBuffer: Buffer;
  inputMime: string;
  dto: ApplyWatermarkDto;
  logoBuffer?: Buffer;
};

@Injectable()
export class WatermarkService {
  async applyWatermark({ inputBuffer, inputMime, dto, logoBuffer }: ApplyArgs): Promise<{ output: Buffer; outMime: string }> {
    const image = Sharp.default(inputBuffer);
    const meta = await image.metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (!width || !height) throw new BadRequestException('Ungültiges Bild.');

    // Determine output format (keep original if supported)
    const outMime = this.chooseOutputMime(inputMime);

    // Build overlays
    const overlays: Sharp.OverlayOptions[] = [];

    if (dto.mode === WatermarkMode.LOGO) {
      const logo = await this.resolveLogo(logoBuffer);
      if (!logo) throw new BadRequestException('No logo found. Send a "logo" file field or use mode=text.');

      if (dto.tile) {
        // Create a tiled SVG pattern from the logo
        const svg = await this.buildLogoTileSvg(logo, width, height, dto);
        overlays.push({ input: Buffer.from(svg), top: 0, left: 0 });
      } else {
        // Cap logo dimensions to image dimensions so Sharp never gets an overlay larger than the base
        const targetW = Math.max(1, Math.min(Math.round(width * (dto.scale ?? 0.2)), width));
        const scaled = await this.scaleLogoToWidth(logo, targetW, height);
        const wmW = scaled.info.width!;
        const wmH = scaled.info.height!;

        const coord = this.resolveAbsolutePosition(dto.position);
        let top: number, left: number;
        if (coord) {
          ({ top, left } = coord);
        } else {
          const anchor = (dto.anchor ?? 'bottom-right') as WatermarkAnchor;
          ({ top, left } = this.resolveAnchorPosition(width, height, wmW, wmH, anchor, dto.margin!));
        }

        // Clamp so the overlay never exceeds image bounds (Sharp hard requirement)
        top  = Math.max(0, Math.min(top,  height - wmH));
        left = Math.max(0, Math.min(left, width  - wmW));

        overlays.push({ input: scaled.buffer, top, left });
      }
    } else if (dto.mode === WatermarkMode.TEXT) {
      if (!dto.text || !dto.text.trim()) throw new BadRequestException('Field "text" is required when mode=text.');
      const svg = dto.tile
        ? this.buildTextTileSvg(dto.text, width, height, dto)
        : this.buildTextSvg(dto.text, width, height, dto);
      overlays.push({ input: Buffer.from(svg), top: 0, left: 0 });
    } else {
      throw new BadRequestException('Unknown mode.');
    }

    let pipeline = Sharp.default(inputBuffer).composite(overlays);

    switch (outMime) {
      case 'image/jpeg':
        pipeline = pipeline.jpeg({ quality: 90 });
        break;
      case 'image/webp':
        pipeline = pipeline.webp({ quality: 90 });
        break;
      case 'image/avif':
        pipeline = pipeline.avif({ quality: 70 });
        break;
      default:
        pipeline = pipeline.png();
    }

    const output = await pipeline.toBuffer();
    return { output, outMime };
  }

  private chooseOutputMime(inputMime: string): string {
    const preferred = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    return preferred.includes(inputMime) ? inputMime : 'image/png';
  }

  private async resolveLogo(logoBuffer?: Buffer): Promise<Buffer | null> {
    if (logoBuffer && logoBuffer.length > 0) return logoBuffer;
    // Resolve default logo relative to this source file so the path works
    // in both local (src/) and production (dist/) environments.
    const candidates = [
      path.resolve(__dirname, 'assets', 'watermark', 'default-logo.png'),
      path.resolve(__dirname, '..', 'assets', 'watermark', 'default-logo.png'),
    ];
    for (const candidate of candidates) {
      try {
        await fs.promises.access(candidate, fs.constants.R_OK);
        return await fs.promises.readFile(candidate);
      } catch {
        // try next candidate
      }
    }
    return null; // no default logo available — caller must handle
  }

  private async scaleLogoToWidth(input: Buffer, targetWidth: number, maxHeight?: number) {
    const resizeOpts: Sharp.ResizeOptions = { width: targetWidth, withoutEnlargement: true };
    if (maxHeight) resizeOpts.height = maxHeight;
    const resized = await Sharp.default(input).resize(resizeOpts).png().toBuffer();
    const resizedInfo = await Sharp.default(resized).metadata();
    return { buffer: resized, info: resizedInfo };
  }

  private resolveAnchorPosition(
    imageW: number,
    imageH: number,
    wmW: number,
    wmH: number,
    anchor: WatermarkAnchor,
    margin: number,
  ) {
    const positions: Record<WatermarkAnchor, { top: number; left: number }> = {
      'top-left': { top: margin, left: margin },
      'top-right': { top: margin, left: imageW - wmW - margin },
      'bottom-left': { top: imageH - wmH - margin, left: margin },
      'bottom-right': { top: imageH - wmH - margin, left: imageW - wmW - margin },
      center: { top: Math.round((imageH - wmH) / 2), left: Math.round((imageW - wmW) / 2) },
      'top-center': { top: margin, left: Math.round((imageW - wmW) / 2) },
      'bottom-center': { top: imageH - wmH - margin, left: Math.round((imageW - wmW) / 2) },
      'center-left': { top: Math.round((imageH - wmH) / 2), left: margin },
      'center-right': { top: Math.round((imageH - wmH) / 2), left: imageW - wmW - margin },
    } as const;
    return positions[anchor] ?? positions['bottom-right'];
  }

  private colorToRgba(color: string, opacity: number): string {
    // very simple hex to rgba; if already rgba/hsla, just return with opacity handled via fill-opacity
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) {
      let r = 0, g = 0, b = 0;
      const hex = color.replace('#', '');
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color; // assume valid CSS color
  }

  private escapeXml(str: string) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private buildTextSvg(text: string, imageW: number, imageH: number, dto: ApplyWatermarkDto): string {
    const safeText = this.escapeXml(text);
    const fontSize = dto.fontSize ?? 48;
    const color = this.colorToRgba(dto.color ?? '#ffffff', dto.opacity ?? 0.5);
    const stroke = dto.strokeWidth && dto.strokeWidth > 0 ? ` stroke="${dto.strokeColor ?? '#000'}" stroke-width="${dto.strokeWidth}"` : '';

    // compute x/y by position (anchor baseline at bottom-left of text)
    // Absolute position (x,y) overrides anchor/margin
    const abs = this.resolveAbsolutePosition(dto.position);
    let x: number; let y: number; let textAnchor = 'start'; let baseline = 'alphabetic';
    if (abs) {
      // Treat provided coordinates as top-left reference for text
      x = abs.left; y = abs.top;
      // better readability when not using baseline as bottom-left
      baseline = 'hanging';
      textAnchor = 'start';
    } else {
      const margin = dto.margin ?? 24;
      const anchor = (dto.anchor ?? 'bottom-right') as WatermarkAnchor;
      switch (anchor) {
        case 'top-left':
          x = margin; y = margin; baseline = 'hanging'; textAnchor = 'start'; break;
        case 'top-center':
          x = imageW / 2; y = margin; baseline = 'hanging'; textAnchor = 'middle'; break;
        case 'top-right':
          x = imageW - margin; y = margin; baseline = 'hanging'; textAnchor = 'end'; break;
        case 'center-left':
          x = margin; y = imageH / 2; baseline = 'middle'; textAnchor = 'start'; break;
        case 'center':
          x = imageW / 2; y = imageH / 2; baseline = 'middle'; textAnchor = 'middle'; break;
        case 'center-right':
          x = imageW - margin; y = imageH / 2; baseline = 'middle'; textAnchor = 'end'; break;
        case 'bottom-left':
          x = margin; y = imageH - margin; baseline = 'alphabetic'; textAnchor = 'start'; break;
        case 'bottom-center':
          x = imageW / 2; y = imageH - margin; baseline = 'alphabetic'; textAnchor = 'middle'; break;
        case 'bottom-right':
        default:
          x = imageW - margin; y = imageH - margin; baseline = 'alphabetic'; textAnchor = 'end'; break;
      }
    }

    const rotate = dto.rotate ?? 0;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${imageW}" height="${imageH}">
  <g transform="rotate(${rotate}, ${x}, ${y})">
    <text x="${x}" y="${y}" font-family="${this.escapeXml(dto.fontFamily ?? 'Arial, sans-serif')}" font-size="${fontSize}"
      fill="${color}" fill-opacity="${dto.opacity ?? 0.5}" text-anchor="${textAnchor}" dominant-baseline="${baseline}"${stroke}>
      ${safeText}
    </text>
  </g>
</svg>`;
  }

  private buildTextTileSvg(text: string, imageW: number, imageH: number, dto: ApplyWatermarkDto): string {
    const safeText = this.escapeXml(text);
    const fontSize = dto.fontSize ?? 48;
    const gap = dto.gap ?? 128;
    const color = this.colorToRgba(dto.color ?? '#ffffff', dto.opacity ?? 0.2);
    const stroke = dto.strokeWidth && dto.strokeWidth > 0 ? ` stroke="${dto.strokeColor ?? '#000'}" stroke-width="${dto.strokeWidth}"` : '';
    const rotate = dto.rotate ?? 0;

    const tileW = gap * 2;
    const tileH = gap * 2;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${imageW}" height="${imageH}">
  <defs>
    <pattern id="wm" patternUnits="userSpaceOnUse" width="${tileW}" height="${tileH}" patternTransform="rotate(${rotate})">
      <text x="${gap/4}" y="${(tileH/2)}" font-family="${this.escapeXml(dto.fontFamily ?? 'Arial, sans-serif')}" font-size="${fontSize}" fill="${color}" fill-opacity="${dto.opacity ?? 0.15}"${stroke}>${safeText}</text>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#wm)" />
</svg>`;
  }

  private async buildLogoTileSvg(logoBuffer: Buffer, imageW: number, imageH: number, dto: ApplyWatermarkDto): Promise<string> {
    // scale logo to desired width first
    const targetLogoW = Math.max(1, Math.round(imageW * (dto.scale ?? 0.2)));
    const scaled = await Sharp.default(logoBuffer).resize({ width: targetLogoW }).png().toBuffer();
    const meta = await Sharp.default(scaled).metadata();
    const b64 = scaled.toString('base64');
    const gap = dto.gap ?? 256;
    const rotate = dto.rotate ?? 0;
    const h = meta.height ?? targetLogoW; // best effort

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${imageW}" height="${imageH}">
  <defs>
    <pattern id="wm" patternUnits="userSpaceOnUse" width="${gap}" height="${gap}" patternTransform="rotate(${rotate})">
      <image href="data:image/png;base64,${b64}" x="0" y="0" width="${targetLogoW}" height="${h}" opacity="${dto.opacity ?? 0.2}"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#wm)" />
</svg>`;
  }

  private resolveAbsolutePosition(position?: string): { top: number; left: number } | null {
    if (!position) return null;
    const m = String(position).trim().match(/^(\d+)\s*,\s*(\d+)$/);
    if (!m) return null;
    const x = Number(m[1]);
    const y = Number(m[2]);
    if (Number.isNaN(x) || Number.isNaN(y)) return null;
    return { left: x, top: y };
  }
}
