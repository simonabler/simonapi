import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, Length } from 'class-validator';

export type JwtAlgorithm = 'HS256' | 'HS512' | 'RS256' | 'ES256' | 'EdDSA';
export type AsymmetricAlgorithm = 'RS256' | 'ES256' | 'EdDSA';

const ALL_ALGOS: JwtAlgorithm[]        = ['HS256', 'HS512', 'RS256', 'ES256', 'EdDSA'];
const ASYMMETRIC_ALGOS: AsymmetricAlgorithm[] = ['RS256', 'ES256', 'EdDSA'];

export class JwtKeypairDto {
  @ApiProperty({ enum: ASYMMETRIC_ALGOS, example: 'RS256' })
  @IsIn(ASYMMETRIC_ALGOS)
  algorithm!: AsymmetricAlgorithm;
}

export class JwtEncodeDto {
  @ApiProperty({ example: { sub: '1234567890', name: 'Simon' } })
  @IsObject()
  payload!: Record<string, unknown>;

  @ApiProperty({ enum: ALL_ALGOS, example: 'HS256' })
  @IsIn(ALL_ALGOS)
  algorithm!: JwtAlgorithm;

  @ApiPropertyOptional({ example: 'my-secret', description: 'Required for HS256/HS512' })
  @IsOptional() @IsString()
  secret?: string;

  @ApiPropertyOptional({ example: '-----BEGIN PRIVATE KEY-----\n...', description: 'Required for RS256/ES256/EdDSA' })
  @IsOptional() @IsString() @Length(1, 8192)
  privateKey?: string;

  @ApiPropertyOptional({ example: '1h', description: 'JWT expiry e.g. 1h, 7d, 30m' })
  @IsOptional() @IsString()
  expiresIn?: string;
}

export class JwtDecodeDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiJ9...' })
  @IsString() @Length(10, 8192)
  token!: string;
}

export class JwtVerifyDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiJ9...' })
  @IsString() @Length(10, 8192)
  token!: string;

  @ApiProperty({ enum: ALL_ALGOS, example: 'HS256' })
  @IsIn(ALL_ALGOS)
  algorithm!: JwtAlgorithm;

  @ApiPropertyOptional({ example: 'my-secret', description: 'Required for HS256/HS512' })
  @IsOptional() @IsString()
  secret?: string;

  @ApiPropertyOptional({ example: '-----BEGIN PUBLIC KEY-----\n...', description: 'Required for RS256/ES256/EdDSA' })
  @IsOptional() @IsString() @Length(1, 8192)
  publicKey?: string;
}
