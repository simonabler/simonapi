import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Query,
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
import { Response } from 'express';

import { getSerializedAiRegistry } from './gs1-ai-registry';
import { BarcodesService } from './barcodes.service';
import { GenerateBarcodeDto } from './dto/generate-barcode.dto';
import { GenerateGs1QueryDto } from './dto/generate-gs1.dto';
import { GenerateGs1BodyDto } from './dto/generate-gs1-body.dto';
import { GenerateGs1BatchDto } from './dto/generate-gs1-batch.dto';
import { ToDigitalLinkDto, FromDigitalLinkDto } from './dto/gs1-digital-link.dto';
import { toDigitalLink, fromDigitalLink } from './gs1-digital-link';
import { classifyGs1Error, gs1ErrorBody } from './gs1-error';

@ApiTags('barcodes')
@Controller('barcode')
export class BarcodesController {
  constructor(private readonly svc: BarcodesService) {}

  // ---------------------------------------------------------------------------
  // Standard barcodes
  // ---------------------------------------------------------------------------

  @Get('png')
  @ApiOperation({ summary: 'Render standard barcode as PNG' })
  @ApiResponse({ status: 400, description: 'Validation error — see error.details[]' })
  @Header('Content-Type', 'image/png')
  @HttpCode(HttpStatus.OK)
  async standardPng(@Query() q: GenerateBarcodeDto, @Res() response: Response) {
    response.send(await this.svc.toPng(q));
  }

  @Get('svg')
  @ApiOperation({ summary: 'Render standard barcode as SVG' })
  @ApiResponse({ status: 400, description: 'Validation error — see error.details[]' })
  @Header('Content-Type', 'image/svg+xml; charset=utf-8')
  @HttpCode(HttpStatus.OK)
  async standardSvg(@Query() q: GenerateBarcodeDto): Promise<string> {
    return this.svc.toSvg(q);
  }

  // ---------------------------------------------------------------------------
  // GS1 barcodes — legacy single-format endpoints (deprecated)
  // ---------------------------------------------------------------------------

  /**
   * @deprecated Use POST /barcode/gs1/render instead — it accepts both PNG and SVG
   * via the `format` field and sets the correct Content-Type automatically.
   */
  @Post('gs1/png')
  @ApiOperation({
    summary: 'Render GS1 barcode as PNG',
    deprecated: true,
    description: '**Deprecated.** Use `POST /barcode/gs1/render` with `"format": "png"` instead.',
  })
  @ApiResponse({ status: 400, description: 'Validation error — see error.details[]' })
  @Header('Content-Type', 'image/png')
  @HttpCode(HttpStatus.OK)
  async gs1Png(@Body() q: GenerateGs1QueryDto, @Res() response: Response) {
    const { symbology, items, includetext, scale, height } = q;
    response.send(await this.svc.gs1ToPng({ symbology, items, includetext, scale, height }));
  }

  /**
   * @deprecated Use POST /barcode/gs1/render instead.
   */
  @Post('gs1/svg')
  @ApiOperation({
    summary: 'Render GS1 barcode as SVG',
    deprecated: true,
    description: '**Deprecated.** Use `POST /barcode/gs1/render` with `"format": "svg"` instead.',
  })
  @ApiResponse({ status: 400, description: 'Validation error — see error.details[]' })
  @Header('Content-Type', 'image/svg+xml; charset=utf-8')
  @HttpCode(HttpStatus.OK)
  async gs1Svg(@Body() q: GenerateGs1QueryDto): Promise<string> {
    const { symbology, items, includetext, scale, height } = q;
    return this.svc.gs1ToSvg({ symbology, items, includetext, scale, height });
  }

  // ---------------------------------------------------------------------------
  // GS1 barcodes — recommended render endpoint
  // ---------------------------------------------------------------------------

  @Post('gs1/render')
  @ApiOperation({
    summary: 'Render GS1 barcode — PNG or SVG (recommended)',
    description:
      'Renders a GS1-128 or GS1 DataMatrix barcode. ' +
      'Validates all AI values, check digits and inter-AI combination rules before rendering. ' +
      'The `Content-Type` response header reflects the requested `format`.',
  })
  @ApiBody({
    type: GenerateGs1BodyDto,
    examples: {
      gtin_batch_expiry_png: {
        summary: 'GTIN + Batch + Expiry → GS1-128 PNG',
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
        summary: 'GTIN → GS1 DataMatrix SVG',
        value: {
          symbology: 'gs1datamatrix',
          format: 'svg',
          items: [{ ai: '01', value: '09506000134376' }],
        },
      },
      sscc: {
        summary: 'SSCC (auto check digit) → GS1-128 PNG',
        value: {
          symbology: 'gs1-128',
          format: 'png',
          items: [{ ai: '00', value: '12345678901234567' }],
          includetext: true,
        },
      },
    },
  })
  @ApiProduces('image/png', 'image/svg+xml')
  @ApiOkResponse({
    description: 'PNG binary (Content-Type: image/png) or SVG text (Content-Type: image/svg+xml; charset=utf-8)',
  })
  @ApiResponse({
    status: 400,
    description:
      'GS1 validation failed. Body: `{ error: "GS1_VALIDATION_FAILED", details: [{ code, ai?, message }] }`',
  })
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

  // ---------------------------------------------------------------------------
  // GS1 batch render (Point 4)
  // ---------------------------------------------------------------------------

  @Post('gs1/batch')
  @ApiOperation({
    summary: 'Batch-render up to 100 GS1 barcodes in a single request',
    description:
      'Each item in `barcodes[]` is rendered independently. ' +
      'Failures are recorded per-item (with `error` / `errorCode` fields) rather than aborting the batch. ' +
      'PNG output is Base64-encoded; SVG is returned as a UTF-8 string.',
  })
  @ApiBody({
    type: GenerateGs1BatchDto,
    examples: {
      two_gtins: {
        summary: '2 GTINs as PNG',
        value: {
          symbology: 'gs1-128',
          format: 'png',
          barcodes: [
            { ref: 'item-1', items: [{ ai: '01', value: '09506000134376' }, { ai: '17', value: '261231' }] },
            { ref: 'item-2', items: [{ ai: '01', value: '09506000134376' }, { ai: '10', value: 'LOT-2' }] },
          ],
          includetext: true,
          scale: 2,
        },
      },
    },
  })
  @ApiOkResponse({
    description:
      'Array of results in request order. Each item has `data` (Base64 PNG or SVG string) on success, ' +
      'or `error` + `errorCode` on failure.',
  })
  @ApiResponse({ status: 400, description: 'Top-level validation error (bad symbology, format, etc.)' })
  @HttpCode(HttpStatus.OK)
  async gs1Batch(@Body() body: GenerateGs1BatchDto) {
    return this.svc.gs1Batch(body);
  }

  // ---------------------------------------------------------------------------
  // GS1 Digital Link (Point 7)
  // ---------------------------------------------------------------------------

  @Post('gs1/digital-link/encode')
  @ApiOperation({
    summary: 'Convert GS1 AI items to a GS1 Digital Link URL',
    description:
      'Builds a canonical GS1 Digital Link URL (ISO/IEC 18975) from validated AI items. ' +
      'The first recognised primary identification AI (GTIN, SSCC, GDTI …) becomes the path root; ' +
      'remaining AIs are appended as qualifier path segments.',
  })
  @ApiBody({
    type: ToDigitalLinkDto,
    examples: {
      gtin_expiry: {
        summary: 'GTIN + Expiry',
        value: {
          items: [
            { ai: '01', value: '09506000134376' },
            { ai: '17', value: '261231' },
            { ai: '10', value: 'LOT-001' },
          ],
        },
      },
      custom_resolver: {
        summary: 'Custom resolver base URL',
        value: {
          baseUrl: 'https://resolve.example.com',
          items: [{ ai: '01', value: '09506000134376' }],
        },
      },
    },
  })
  @ApiOkResponse({
    description: '`{ url, primaryAi, primaryValue, qualifiers }`',
  })
  @ApiResponse({ status: 400, description: 'No primary identification AI found in items' })
  @HttpCode(HttpStatus.OK)
  gs1DigitalLinkEncode(@Body() body: ToDigitalLinkDto) {
    try {
      return toDigitalLink(body.items, body.baseUrl);
    } catch (e: any) {
      throw new BadRequestException(gs1ErrorBody([classifyGs1Error(e)]));
    }
  }

  @Post('gs1/digital-link/decode')
  @ApiOperation({
    summary: 'Parse a GS1 Digital Link URL into AI items',
    description:
      'Parses a GS1 Digital Link URL or path back into an array of `{ ai, value }` objects. ' +
      'Accepts both full URLs (https://id.gs1.org/01/…) and bare paths (/01/…).',
  })
  @ApiBody({
    type: FromDigitalLinkDto,
    examples: {
      full_url: {
        summary: 'Full URL',
        value: { url: 'https://id.gs1.org/01/09506000134376/17/261231/10/LOT-001' },
      },
      bare_path: {
        summary: 'Bare path',
        value: { url: '/01/09506000134376' },
      },
    },
  })
  @ApiOkResponse({
    description: 'Array of `{ ai, value }` pairs parsed from the URL path',
  })
  @ApiResponse({ status: 400, description: 'URL cannot be parsed as a GS1 Digital Link' })
  @HttpCode(HttpStatus.OK)
  gs1DigitalLinkDecode(@Body() body: FromDigitalLinkDto) {
    try {
      return fromDigitalLink(body.url);
    } catch (e: any) {
      throw new BadRequestException(gs1ErrorBody([classifyGs1Error(e)]));
    }
  }

  // ---------------------------------------------------------------------------
  // GS1 AI registry
  // ---------------------------------------------------------------------------

  @Get('gs1/registry')
  @ApiOperation({
    summary: 'Get the GS1 AI registry as JSON',
    description:
      'Returns the full GS1 Application Identifier registry (536 AIs) with pattern, label, ' +
      'combination constraints and hints. Response is memoized server-side and HTTP-cached for 24 h.',
  })
  @ApiOkResponse({ description: 'Record<ai, AiSerializedSpec>' })
  @HttpCode(HttpStatus.OK)
  gs1Registry(@Res() res: Response): void {
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    res.setHeader('ETag', '"gs1-registry-v1"');
    res.json(getSerializedAiRegistry());
  }
}
