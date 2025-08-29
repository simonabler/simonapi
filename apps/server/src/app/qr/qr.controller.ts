import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { GenerateQrDto } from './dto/generate-qr.dto';
import { QrService } from './qr.service';
//import { PresetStore } from './preset-store';
import { QrPreset } from './types';


@Controller('qr')
export class QrController {
  constructor(private readonly qr: QrService, /*private readonly store: PresetStore*/) {}


  /**
  * Erzeugt QR (PNG oder SVG). Standard: SVG inline Response.
  * Query-Param `download=1` erzwingt Datei-Download.
  */
  @Post()
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