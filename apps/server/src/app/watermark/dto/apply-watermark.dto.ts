import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

enum Mode { LOGO = 'logo', TEXT = 'text' }

enum Position {
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

  @ApiPropertyOptional({ enum: Position, default: Position.BOTTOM_RIGHT })
  @IsOptional()
  @IsEnum(Position)
  position?: Position = Position.BOTTOM_RIGHT;

  @ApiPropertyOptional({ default: 0.5, minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  opacity?: number = 0.5;

  @ApiPropertyOptional({ description: 'Logo-Breite relativ zur Bildbreite (0..1)', default: 0.2 })
  @IsOptional()
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
  @IsNumber()
  rotate?: number = 0;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  tile?: boolean = false;

  @ApiPropertyOptional({ default: 128 })
  @IsOptional()
  @IsNumber()
  gap?: number = 128;

  // TEXT MODE
  @ApiPropertyOptional({ example: '© Ematric 2025' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ default: 48 })
  @IsOptional()
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
  @IsNumber()
  strokeWidth?: number = 0;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  download?: boolean = false;
}

export { Mode as WatermarkMode, Position as WatermarkPosition };

