import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class Gs1BodyItemDto {
  @ApiProperty({ description: 'Application Identifier (AI)' })
  @IsString()
  ai!: string;

  @ApiProperty({ description: 'AI value' })
  @IsString()
  value!: string;
}

export class GenerateGs1BodyDto {
  @ApiProperty({ enum: ['gs1-128', 'gs1datamatrix'] })
  @IsIn(['gs1-128', 'gs1datamatrix'])
  symbology!: 'gs1-128' | 'gs1datamatrix';

  @ApiProperty({ enum: ['png', 'svg'] })
  @IsIn(['png', 'svg'])
  format!: 'png' | 'svg';

  @ApiProperty({ type: [Gs1BodyItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Gs1BodyItemDto)
  items!: Gs1BodyItemDto[];

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

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  height?: number;
}

