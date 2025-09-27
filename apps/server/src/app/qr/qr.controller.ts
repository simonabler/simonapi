import { BadRequestException, Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Response } from 'express';
import { GenerateQrDto } from './dto/generate-qr.dto';
import { QrService } from './qr.service';
//import { PresetStore } from './preset-store';

@ApiTags('qr')
@Controller('qr')
export class QrController {
  constructor(private readonly qr: QrService /*private readonly store: PresetStore*/ ) {}

  /**
   * Generates a QR code (PNG or SVG). Default: SVG inline response.
   * Query param `download=1` enforces a file download.
   */
  @Post()
  @ApiOperation({ summary: 'Generates a QR code (PNG or SVG). Optional download.' })
  @ApiQuery({ name: 'download', required: false, description: 'If =1, a file download is enforced.' })
  @ApiBody({
    description: 'Definition of the QR code including data and output format',
    type: GenerateQrDto,
    examples: {
      url_svg: {
        summary: 'URL -> SVG',
        value: { type: 'url', payload: { url: 'https://example.com' }, format: 'svg', size: 512, margin: 2, ecc: 'M' },
      },
      text_png: {
        summary: 'Text -> PNG',
        value: { type: 'text', payload: { text: 'Hello World' }, format: 'png', size: 256, margin: 2, ecc: 'Q' },
      },
      wifi_svg: {
        summary: 'Wi-Fi -> SVG',
        value: { type: 'wifi', payload: { ssid: 'MyWifi', password: 'secret', encryption: 'WPA', hidden: false }, format: 'svg' },
      },
    },
  })
  @ApiOkResponse({
    description: 'SVG string or PNG binary',
    content: {
      'image/svg+xml': { schema: { type: 'string', example: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">...</svg>' } },
      'image/png': { schema: { type: 'string', format: 'binary' } },
    },
  })
  async create(@Body() dto: GenerateQrDto, @Res() res: Response, @Query('download') download?: string) {
    return this.sendQr(dto, res, download);
  }

  @Get()
  @ApiOperation({ summary: 'Generates a QR code (PNG or SVG) via query parameters. Optional download.' })
  @ApiQuery({ name: 'type', required: true, description: 'Data type for the QR code (e.g. url, text, wifi).' })
  @ApiQuery({ name: 'payload', required: true, description: 'JSON-encoded payload, depending on the data type.' })
  @ApiQuery({ name: 'format', required: false, description: 'Output format (png or svg). Default: svg.' })
  @ApiQuery({ name: 'size', required: false, description: 'Side length in pixels (64-4096). Default: 512.' })
  @ApiQuery({ name: 'margin', required: false, description: 'Margin in modules (0-20). Default: 2.' })
  @ApiQuery({ name: 'ecc', required: false, description: 'Error correction level (L, M, Q, H). Default: M.' })
  @ApiQuery({ name: 'download', required: false, description: 'If =1, a file download is enforced.' })
  async createFromQuery(@Query() query: Record<string, string | undefined>, @Res() res: Response) {
    const { download, payload: payloadRaw, type, format, size, margin, ecc } = query;

    if (!type) {
      throw new BadRequestException('type query parameter is required');
    }

    if (!payloadRaw) {
      throw new BadRequestException('payload query parameter is required');
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(payloadRaw);
    } catch (error) {
      throw new BadRequestException('payload must be valid JSON');
    }

    const dtoPlain: Partial<GenerateQrDto> = {
      type: type as GenerateQrDto['type'],
      payload,
      format: format as GenerateQrDto['format'],
      size: size !== undefined ? Number(size) : undefined,
      margin: margin !== undefined ? Number(margin) : undefined,
      ecc: ecc as GenerateQrDto['ecc'],
    };

    if (dtoPlain.size !== undefined && Number.isNaN(dtoPlain.size)) {
      throw new BadRequestException('size must be a number');
    }

    if (dtoPlain.margin !== undefined && Number.isNaN(dtoPlain.margin)) {
      throw new BadRequestException('margin must be a number');
    }

    const dto = plainToInstance(GenerateQrDto, dtoPlain);
    const errors = await validate(dto);
    if (errors.length) {
      throw new BadRequestException(errors);
    }

    return this.sendQr(dto, res, download);
  }

  private async sendQr(dto: GenerateQrDto, res: Response, download?: string) {
    const { body, mime, format } = await this.qr.generate(dto);
    res.setHeader('Content-Type', mime);
    if (download) {
      const filename = `qr-${dto.type}.${format}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    return res.send(body);
  }
}
