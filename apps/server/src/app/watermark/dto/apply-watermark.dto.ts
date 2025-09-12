import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

enum Mode { LOGO = 'logo', TEXT = 'text' }

enum Anchor {
  CENTER = 'center',
  TOP_LEFT = 'top-left',
  TOP_RIGHT = 'top-right',
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_RIGHT = 'bottom-right',
  TOP_CENTER = 'top-center',
  BOTTOM_CENTER = 'bottom-center',
  CENTER_LEFT = 'center-left',
  CENTER_RIGHT = 'center-right',
}

export class ApplyWatermarkDto {
  @ApiProperty({ enum: Mode })
  @IsEnum(Mode)
  mode: Mode;

  // New absolute position (x,y) in px; when provided, overrides margin-based offset
  @ApiPropertyOptional({ description: 'Absolute Position "x,y" in px; überschreibt margin-basiertes Offset.' })
  @IsOptional()
  @IsString()
  position?: string;

  // Renamed from "position" → "anchor" for anchor enum
  @ApiPropertyOptional({ enum: Anchor, default: Anchor.BOTTOM_RIGHT })
  @IsOptional()
  @IsEnum(Anchor)
  anchor?: Anchor = Anchor.BOTTOM_RIGHT;

  @ApiPropertyOptional({ default: 0.5, minimum: 0, maximum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  opacity?: number = 0.5;

  @ApiPropertyOptional({ description: 'Logo-Breite relativ zur Bildbreite (0..1)', default: 0.2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(1)
  scale?: number = 0.2;

  @ApiPropertyOptional({ default: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  margin?: number = 24;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rotate?: number = 0;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const v = value.toLowerCase();
      if (v === 'true' || v === '1') return true;
      if (v === 'false' || v === '0') return false;
    }
    return undefined;
  })  @IsBoolean()
  tile?: boolean = false;

  @ApiPropertyOptional({ default: 128 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  gap?: number = 128;

  // TEXT MODE
  @ApiPropertyOptional({ example: '© Ematric 2025' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ default: 48 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fontSize?: number = 48;

  @ApiPropertyOptional({ default: 'Arial, sans-serif' })
  @IsOptional()
  @IsString()
  fontFamily?: string = 'Arial, sans-serif';

  @ApiPropertyOptional({ default: '#ffffff' })
  @IsOptional()
  @IsString()
  color?: string = '#ffffff';

  @ApiPropertyOptional({ default: '#000000' })
  @IsOptional()
  @IsString()
  strokeColor?: string = '#000000';

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  strokeWidth?: number = 0;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const v = value.toLowerCase();
      if (v === 'true' || v === '1') return true;
      if (v === 'false' || v === '0') return false;
    }
    return undefined;
  })  @IsBoolean()
  download?: boolean = false;
}

export { Mode as WatermarkMode, Anchor as WatermarkAnchor };
