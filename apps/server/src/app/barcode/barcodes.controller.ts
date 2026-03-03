import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Body,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { getSerializedAiRegistry } from './gs1-ai-registry';
import { BarcodesService } from './barcodes.service';
import { GenerateBarcodeDto } from './dto/generate-barcode.dto';
import { GenerateGs1QueryDto } from './dto/generate-gs1.dto';
import { GenerateGs1BodyDto } from './dto/generate-gs1-body.dto';
import { Response } from 'express';

@ApiTags('barcodes')
@Controller('barcode')
export class BarcodesController {
  constructor(private readonly svc: BarcodesService) {}

  @Get('png')
  @ApiOperation({ summary: 'Render standard barcode as PNG' })
  @Header('Content-Type', 'image/png')
  @HttpCode(HttpStatus.OK)
  async standardPng(@Query() q: GenerateBarcodeDto, @Res() response: Response) {
    response.send(await this.svc.toPng(q));
  }

  @Get('svg')
  @ApiOperation({ summary: 'Render standard barcode as SVG' })
  @Header('Content-Type', 'image/svg+xml; charset=utf-8')
  @HttpCode(HttpStatus.OK)
  async standardSvg(@Query() q: GenerateBarcodeDto): Promise<string> {
    return this.svc.toSvg(q);
  }

  @Post('gs1/png')
  @ApiOperation({ summary: 'Render GS1 barcode (GS1-128/DataMatrix) as PNG' })
  @Header('Content-Type', 'image/png')
  @HttpCode(HttpStatus.OK)
  async gs1Png(@Body() q: GenerateGs1QueryDto, @Res() response: Response) {
    const { symbology, items, includetext, scale, height } = q;
    response.send(await this.svc.gs1ToPng({ symbology, items, includetext, scale, height }));
  }

  @Post('gs1/svg')
  @ApiOperation({ summary: 'Render GS1 barcode (GS1-128/DataMatrix) as SVG' })
  @Header('Content-Type', 'image/svg+xml; charset=utf-8')
  @HttpCode(HttpStatus.OK)
  async gs1Svg(@Body() q: GenerateGs1QueryDto): Promise<string> {
    const { symbology, items, includetext, scale, height } = q;
    return this.svc.gs1ToSvg({ symbology, items, includetext, scale, height });
  }

  /**
   * Recommended GS1 render endpoint — accepts both PNG and SVG via the `format` field.
   * Sets the correct Content-Type header dynamically based on the requested format.
   */
  @Post('gs1/render')
  @ApiOperation({ summary: 'Render GS1 via JSON body (recommended)' })
  @ApiBody({
    type: GenerateGs1BodyDto,
    examples: {
      gtin_batch_expiry: {
        summary: 'GTIN + Batch + Expiry (GS1-128 PNG)',
        value: {
          symbology: 'gs1-128',
          format: 'png',
          items: [
            { ai: '01', value: '09506000134376' },
            { ai: '10', value: 'LOT-001' },
            { ai: '17', value: '261231' },
          ],
          includetext: true,
          scale: 3,
        },
      },
      datamatrix_svg: {
        summary: 'GTIN DataMatrix SVG',
        value: {
          symbology: 'gs1datamatrix',
          format: 'svg',
          items: [{ ai: '01', value: '09506000134376' }],
        },
      },
    },
  })
  @ApiProduces('image/png', 'image/svg+xml')
  @ApiOkResponse({ description: 'PNG binary (image/png) or SVG text (image/svg+xml) depending on format field' })
  @ApiResponse({ status: 400, description: 'GS1 validation error (invalid AI value, combination or check digit)' })
  async gs1Render(@Body() body: GenerateGs1BodyDto, @Res() res: Response): Promise<void> {
    const { symbology, format, items, includetext, scale, height } = body;
    if (format === 'png') {
      const buf = await this.svc.gs1ToPng({ symbology, items, includetext, scale, height });
      res.setHeader('Content-Type', 'image/png');
      res.send(buf);
    } else {
      const svg = this.svc.gs1ToSvg({ symbology, items, includetext, scale, height });
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.send(svg);
    }
  }

  @Get('gs1/registry')
  @ApiOperation({ summary: 'Get GS1 AI registry (JSON)' })
  @ApiOkResponse({ description: 'Serialized GS1 AI registry — static data, aggressively cached' })
  @HttpCode(HttpStatus.OK)
  gs1Registry(@Res() res: Response): void {
    // Registry is static at runtime — safe to cache for 24 h in clients and CDNs.
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    res.setHeader('ETag', '"gs1-registry-v1"');
    res.json(getSerializedAiRegistry());
  }
}
