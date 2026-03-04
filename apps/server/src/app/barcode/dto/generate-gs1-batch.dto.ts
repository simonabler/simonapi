import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class Gs1BatchItemDto {
  /** Optional caller-supplied reference echoed back in the response. */
  @ApiProperty({ required: false, description: 'Optional caller reference, echoed in response' })
  @IsOptional()
  @IsString()
  ref?: string;

  @ApiProperty({ type: 'array', items: { type: 'object', properties: { ai: { type: 'string' }, value: { type: 'string' } } } })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchAiItemDto)
  items!: BatchAiItemDto[];
}

export class BatchAiItemDto {
  @ApiProperty({ description: 'GS1 Application Identifier (e.g. "01", "17", "10")' })
  @IsString()
  ai!: string;

  @ApiProperty({ description: 'AI value' })
  @IsString()
  value!: string;
}

export class GenerateGs1BatchDto {
  @ApiProperty({ enum: ['gs1-128', 'gs1datamatrix'], description: 'Barcode symbology' })
  @IsIn(['gs1-128', 'gs1datamatrix'])
  symbology!: 'gs1-128' | 'gs1datamatrix';

  @ApiProperty({ enum: ['png', 'svg'], description: 'Output format. PNG is returned Base64-encoded, SVG as UTF-8 text.' })
  @IsIn(['png', 'svg'])
  format!: 'png' | 'svg';

  @ApiProperty({
    type: [Gs1BatchItemDto],
    description: 'Array of barcode definitions. Maximum 100 per request.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => Gs1BatchItemDto)
  barcodes!: Gs1BatchItemDto[];

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includetext?: boolean = false;

  @ApiProperty({ required: false, default: 3, minimum: 1, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  scale?: number = 3;

  @ApiProperty({ required: false, description: 'Bar height in modules (1D symbologies)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  height?: number;
}

/** Shape of one item in the batch response. */
export interface Gs1BatchResultItem {
  /** Echoed from request if provided. */
  ref?: string;
  /** Index in the request array (0-based). */
  index: number;
  /** Base64-encoded PNG or raw SVG string. Absent on error. */
  data?: string;
  /** MIME type of data: image/png or image/svg+xml. */
  mimeType?: string;
  /** Present only when this item failed. */
  error?: string;
  /** Structured error code — see Gs1ErrorCode. Present only when error is set. */
  errorCode?: string;
}
