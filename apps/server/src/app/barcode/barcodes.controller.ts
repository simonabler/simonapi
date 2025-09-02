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
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
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

  @Get('gs1/png')
  @ApiOperation({ summary: 'Render GS1 barcode (GS1-128/DataMatrix) as PNG' })
  @Header('Content-Type', 'image/png')
  @HttpCode(HttpStatus.OK)
  async gs1Png(@Query() q: GenerateGs1QueryDto, @Res() response: Response){
    const { symbology, items, includetext, scale, height } = q;
     response.send(await  this.svc.gs1ToPng({ symbology, items, includetext, scale, height }));
  }

  @Get('gs1/svg')
  @ApiOperation({ summary: 'Render GS1 barcode (GS1-128/DataMatrix) as SVG' })
  @Header('Content-Type', 'image/svg+xml; charset=utf-8')
  @HttpCode(HttpStatus.OK)
  async gs1Svg(@Query() q: GenerateGs1QueryDto): Promise<string> {
    const { symbology, items, includetext, scale, height } = q;
    return this.svc.gs1ToSvg({ symbology, items, includetext, scale, height });
  }

  @Post('gs1/render')
  @ApiOperation({ summary: 'Render GS1 via JSON body (recommended)' })
  @ApiBody({ type: GenerateGs1BodyDto })
  @ApiOkResponse({ description: 'PNG image (binary) or SVG (text)', schema: { type: 'string', format: 'binary' } })
  async gs1Render(@Body() body: GenerateGs1BodyDto): Promise<any> {
    const { symbology, format, items, includetext, scale, height } = body;
    if (format === 'png') {
      return this.svc.gs1ToPng({ symbology, items, includetext, scale, height });
    }
    return this.svc.gs1ToSvg({ symbology, items, includetext, scale, height });
  }
}

