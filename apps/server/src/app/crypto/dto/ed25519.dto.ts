import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class Ed25519SignDto {
  @ApiProperty({ example: 'data to sign' })
  @IsString() @Length(1, 1_000_000)
  message!: string;

  @ApiProperty({ example: '-----BEGIN PRIVATE KEY-----\n...' })
  @IsString() @Length(1, 8192)
  privateKey!: string;

  @ApiPropertyOptional({ enum: ['hex', 'base64', 'base64url'], default: 'hex' })
  @IsOptional() @IsIn(['hex', 'base64', 'base64url'])
  encoding?: 'hex' | 'base64' | 'base64url' = 'hex';
}

export class Ed25519VerifyDto {
  @ApiProperty({ example: 'data to sign' })
  @IsString() @Length(1, 1_000_000)
  message!: string;

  @ApiProperty({ example: 'abc123...' })
  @IsString() @Length(1, 512)
  signature!: string;

  @ApiProperty({ example: '-----BEGIN PUBLIC KEY-----\n...' })
  @IsString() @Length(1, 8192)
  publicKey!: string;

  @ApiPropertyOptional({ enum: ['hex', 'base64', 'base64url'], default: 'hex' })
  @IsOptional() @IsIn(['hex', 'base64', 'base64url'])
  encoding?: 'hex' | 'base64' | 'base64url' = 'hex';
}
