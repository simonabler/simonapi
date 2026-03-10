import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class TotpSetupDto {
  @ApiPropertyOptional({ example: 'Simon API Hub', default: 'Simon API Hub' })
  @IsOptional() @IsString()
  issuer?: string = 'Simon API Hub';

  @ApiProperty({ example: 'simon@abler.tirol' })
  @IsString() @Length(1, 254)
  accountName!: string;

  @ApiPropertyOptional({ enum: ['SHA1', 'SHA256', 'SHA512'], default: 'SHA1' })
  @IsOptional() @IsIn(['SHA1', 'SHA256', 'SHA512'])
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512' = 'SHA1';

  @ApiPropertyOptional({ enum: [6, 8], default: 6 })
  @IsOptional() @IsInt() @IsIn([6, 8])
  @Transform(({ value }) => Number(value))
  digits?: 6 | 8 = 6;

  @ApiPropertyOptional({ enum: [30, 60], default: 30 })
  @IsOptional() @IsInt() @IsIn([30, 60])
  @Transform(({ value }) => Number(value))
  period?: 30 | 60 = 30;

  @ApiPropertyOptional({ enum: ['svg', 'png'], default: 'svg' })
  @IsOptional() @IsIn(['svg', 'png'])
  qrFormat?: 'svg' | 'png' = 'svg';
}

export class TotpVerifyDto {
  @ApiProperty({ example: 'JBSWY3DPEHPK3PXP' })
  @IsString() @Length(1, 256)
  secret!: string;

  @ApiProperty({ example: '123456', description: '6 or 8 digit TOTP token' })
  @IsString() @Length(6, 8)
  token!: string;

  @ApiPropertyOptional({ default: 1, minimum: 0, maximum: 2, description: 'Allowed time-window drift (±N × period seconds)' })
  @IsOptional() @IsInt() @Min(0) @Max(2)
  @Transform(({ value }) => Number(value))
  window?: number = 1;
}

export class TotpGenerateDto {
  @ApiProperty({ example: 'JBSWY3DPEHPK3PXP' })
  @IsString() @Length(1, 256)
  secret!: string;

  @ApiPropertyOptional({ enum: [30, 60], default: 30 })
  @IsOptional() @IsInt() @IsIn([30, 60])
  @Transform(({ value }) => Number(value))
  period?: 30 | 60 = 30;

  @ApiPropertyOptional({ enum: [6, 8], default: 6 })
  @IsOptional() @IsInt() @IsIn([6, 8])
  @Transform(({ value }) => Number(value))
  digits?: 6 | 8 = 6;
}
