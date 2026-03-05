import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class SsccBuildDto {
  @ApiProperty({ example: 3, description: 'Extension digit (0–9)' })
  @IsInt() @Min(0) @Max(9)
  @Transform(({ value }) => Number(value))
  extensionDigit!: number;

  @ApiProperty({ example: '0350000', description: 'GS1 Company Prefix, 7–10 digits' })
  @IsString() @Matches(/^\d{7,10}$/, { message: 'companyPrefix must be 7–10 digits' })
  companyPrefix!: string;

  @ApiProperty({ example: '1', description: 'Serial reference — padded left with zeros automatically' })
  @IsString() @Matches(/^\d{1,9}$/, { message: 'serialReference must be 1–9 digits' })
  serialReference!: string;

  @ApiPropertyOptional({ enum: ['png', 'svg'], default: 'png' })
  @IsOptional() @IsString()
  format?: 'png' | 'svg';

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  includetext?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 10, default: 3 })
  @IsOptional() @IsInt() @Min(1) @Max(10)
  scale?: number;
}

export class SsccAutoDto {
  @ApiProperty({ example: 3, description: 'Extension digit (0–9)' })
  @IsInt() @Min(0) @Max(9)
  @Transform(({ value }) => Number(value))
  extensionDigit!: number;

  @ApiProperty({ example: '0350000', description: 'GS1 Company Prefix, 7–10 digits' })
  @IsString() @Matches(/^\d{7,10}$/, { message: 'companyPrefix must be 7–10 digits' })
  companyPrefix!: string;

  @ApiPropertyOptional({ enum: ['png', 'svg'], default: 'png' })
  @IsOptional() @IsString()
  format?: 'png' | 'svg';

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  includetext?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 10, default: 3 })
  @IsOptional() @IsInt() @Min(1) @Max(10)
  scale?: number;
}

export class SsccValidateDto {
  @ApiProperty({ example: '330350000000000014', description: '18-digit SSCC to validate' })
  @IsString() @Matches(/^\d{18}$/, { message: 'sscc must be exactly 18 digits' })
  sscc!: string;
}

export class SsccRenderDto {
  @ApiProperty({ example: '330350000000000014' })
  @IsString() @Matches(/^\d{18}$/)
  sscc!: string;

  @ApiPropertyOptional({ enum: ['png', 'svg'], default: 'png' })
  @IsOptional() @IsString()
  format?: 'png' | 'svg';

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  includetext?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 10, default: 3 })
  @IsOptional() @IsInt() @Min(1) @Max(10)
  scale?: number;
}
