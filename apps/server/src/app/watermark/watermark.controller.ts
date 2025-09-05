import {
  BadRequestException,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  Res,
  Body,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WatermarkService } from './watermark.service';
import { ApplyWatermarkDto } from './dto/apply-watermark.dto';

@ApiTags('watermark')
@Controller('watermark')
export class WatermarkController {
  constructor(private readonly service: WatermarkService) {}

  @Post('apply')
  @ApiOperation({ summary: 'Bild hochladen und automatisch mit Wasserzeichen versehen (Logo oder Text).' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Multipart Upload: "file" (Pflicht) + optional "logo" bei mode=logo + weitere Felder',
    schema: {
      type: 'object',
      required: ['file', 'mode'],
      properties: {
        file: { type: 'string', format: 'binary' },
        logo: { type: 'string', format: 'binary' },
        mode: { type: 'string', enum: ['logo', 'text'] },
        position: {
          type: 'string',
          enum: [
            'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right',
            'top-center', 'bottom-center', 'center-left', 'center-right'
          ],
          default: 'bottom-right',
        },
        opacity: { type: 'number', default: 0.5, minimum: 0, maximum: 1 },
        scale: { type: 'number', default: 0.2, description: 'Logo-Breite relativ zur Bildbreite (0..1)' },
        margin: { type: 'number', default: 24 },
        rotate: { type: 'number', default: 0 },
        tile: { type: 'boolean', default: false, description: 'Wiederholtes Muster über das ganze Bild (bes. für Text)' },
        gap: { type: 'number', default: 128, description: 'Abstand beim Tile-Muster' },
        text: { type: 'string', description: 'Pflicht, wenn mode=text', example: '© Ematric 2025' },
        fontSize: { type: 'number', default: 48 },
        fontFamily: { type: 'string', default: 'Arial, sans-serif' },
        color: { type: 'string', default: '#ffffff', description: 'Hex oder CSS-Farbe' },
        strokeColor: { type: 'string', default: '#000000' },
        strokeWidth: { type: 'number', default: 0 },
        download: { type: 'boolean', default: false, description: 'Antwort als Download erzwingen' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Gibt das wasserzeichen-versehene Bild zurück (gleiche Bildart wie Upload wenn möglich).' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'logo', maxCount: 1 },
    ], {
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
        if (!allowed.includes(file.mimetype)) return cb(new BadRequestException('Nur JPEG, PNG, WEBP, AVIF erlaubt.'), false);
        cb(null, true);
      },
    }),
  )
  async apply(
    @UploadedFiles() files: { file?: Express.Multer.File[]; logo?: Express.Multer.File[] },
    @Body() body: ApplyWatermarkDto,
    @Res() res: Response,
  ) {
    const file = files?.file?.[0];
    if (!file) throw new BadRequestException('Feld "file" fehlt.');

    const logo = files?.logo?.[0];

    const { buffer: inputBuffer, mimetype } = file;

    const { output, outMime } = await this.service.applyWatermark({
      inputBuffer,
      inputMime: mimetype,
      dto: body,
      logoBuffer: logo?.buffer,
    });

    res.setHeader('Content-Type', outMime);

    if (body.download === true ) {
      res.setHeader('Content-Disposition', 'attachment; filename="watermarked"');
    }

    // Ensure 201 to match POST default behavior in tests
    res.status(201);
    return res.send(output);
  }
}

