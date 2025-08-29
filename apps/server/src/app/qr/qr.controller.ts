import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { GenerateQrDto } from './dto/generate-qr.dto';
import { QrService } from './qr.service';
//import { PresetStore } from './preset-store';
import { QrPreset } from './types';
import { ApiBody, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';


@ApiTags('qr')
@Controller('qr')
export class QrController {
  constructor(private readonly qr: QrService, /*private readonly store: PresetStore*/) {}


  /**
  * Erzeugt QR (PNG oder SVG). Standard: SVG inline Response.
  * Query-Param `download=1` erzwingt Datei-Download.
  */
  @Post()
  @ApiOperation({ summary: 'Erzeugt QR (PNG oder SVG). Optional als Download.' })
  @ApiQuery({ name: 'download', required: false, description: 'Wenn =1, wird ein Datei-Download erzwungen.' })
  @ApiBody({
    description: 'Definition des QR-Codes inkl. Daten und Ausgabeformat',
    type: GenerateQrDto,
    examples: {
      url_svg: {
        summary: 'URL → SVG',
        value: { type: 'url', payload: { url: 'https://example.com' }, format: 'svg', size: 512, margin: 2, ecc: 'M' },
      },
      text_png: {
        summary: 'Text → PNG',
        value: { type: 'text', payload: { text: 'Hello World' }, format: 'png', size: 256, margin: 2, ecc: 'Q' },
      },
      wifi_svg: {
        summary: 'WLAN → SVG',
        value: { type: 'wifi', payload: { ssid: 'MyWifi', password: 'secret', encryption: 'WPA', hidden: false }, format: 'svg' },
      },
    },
  })
  @ApiOkResponse({
    description: 'SVG-String oder PNG-Binary',
    content: {
      'image/svg+xml': { schema: { type: 'string', example: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">…</svg>' } },
      'image/png': { schema: { type: 'string', format: 'binary' } },
    },
  })
  async create(@Body() dto: GenerateQrDto, @Res() res: Response, @Query('download') download?: string) {
    const { body, mime, format } = await this.qr.generate(dto);
    res.setHeader('Content-Type', mime);
    if (download) {
      const filename = `qr-${dto.type}.${format}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    res.send(body);
  }
}
