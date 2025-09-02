import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum StandardBarcodeType {
  CODE128 = 'code128',
  EAN13 = 'ean13',
  EAN8 = 'ean8',
  UPCA = 'upca',
  CODE39 = 'code39',
  ITF14 = 'itf14',
  PDF417 = 'pdf417',
  DATAMATRIX = 'datamatrix',
}

export class GenerateBarcodeDto {
  @ApiProperty({ enum: StandardBarcodeType })
  @IsEnum(StandardBarcodeType)
  type!: StandardBarcodeType;

  @ApiProperty({ description: 'Content to encode' })
  @IsString()
  text!: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includetext?: boolean = false;

  @ApiProperty({ required: false, default: 3, minimum: 1, maximum: 10 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  @Max(10)
  scale?: number = 3;

  @ApiProperty({ required: false, description: 'Bar height (1D symbologies)' })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  @Max(200)
  height?: number;
}

