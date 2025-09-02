import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class Gs1ItemDto {
  @ApiProperty({ description: 'Application Identifier (AI) like 01, 17, 10, 21, 240, 241, 00, 3922' })
  @IsString()
  ai!: string;

  @ApiProperty({ description: 'AI value' })
  @IsString()
  value!: string;
}

export class GenerateGs1QueryDto {
  @ApiProperty({ enum: ['gs1-128', 'gs1datamatrix'] })
  @IsIn(['gs1-128', 'gs1datamatrix'])
  symbology!: 'gs1-128' | 'gs1datamatrix';

  @ApiProperty({ type: [Gs1ItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Gs1ItemDto)
  items!: Gs1ItemDto[];

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

  @ApiProperty({ required: false, description: 'Bar height for 1D symbologies' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  height?: number;
}

