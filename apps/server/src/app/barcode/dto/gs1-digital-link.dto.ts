import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';

export class DigitalLinkItemDto {
  @ApiProperty({ description: 'GS1 Application Identifier (e.g. "01", "17")' })
  @IsString()
  ai!: string;

  @ApiProperty({ description: 'AI value (already normalised, e.g. GTIN with check digit)' })
  @IsString()
  value!: string;
}

export class ToDigitalLinkDto {
  @ApiProperty({ type: [DigitalLinkItemDto], description: 'Validated GS1 AI items' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DigitalLinkItemDto)
  items!: DigitalLinkItemDto[];

  @ApiProperty({
    required: false,
    default: 'https://id.gs1.org',
    description: 'Base URL for the Digital Link resolver',
  })
  @IsOptional()
  @IsString()
  baseUrl?: string;
}

export class FromDigitalLinkDto {
  @ApiProperty({ description: 'GS1 Digital Link URL or path to parse' })
  @IsString()
  url!: string;
}
