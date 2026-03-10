import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CryptoHashDto {
  @ApiProperty({ example: 'hello world', description: 'Data to hash (UTF-8 string)' })
  @IsString() @Length(1, 1_000_000)
  data!: string;

  @ApiProperty({ enum: ['md5', 'sha256', 'sha512', 'bcrypt'], example: 'sha256' })
  @IsIn(['md5', 'sha256', 'sha512', 'bcrypt'])
  algo!: 'md5' | 'sha256' | 'sha512' | 'bcrypt';

  @ApiPropertyOptional({ minimum: 4, maximum: 15, default: 10, description: 'bcrypt only' })
  @IsOptional() @IsInt() @Min(4) @Max(15)
  @Transform(({ value }) => Number(value))
  saltRounds?: number = 10;
}

export class HmacDto {
  @ApiProperty({ example: 'Hello World' })
  @IsString() @Length(1, 1_000_000)
  data!: string;

  @ApiProperty({ example: 'my-secret-key' })
  @IsString() @Length(1, 4096)
  key!: string;

  @ApiPropertyOptional({ enum: ['sha1', 'sha256', 'sha512', 'md5'], default: 'sha256' })
  @IsOptional() @IsIn(['sha1', 'sha256', 'sha512', 'md5'])
  algorithm?: 'sha1' | 'sha256' | 'sha512' | 'md5' = 'sha256';

  @ApiPropertyOptional({ enum: ['hex', 'base64', 'base64url'], default: 'hex' })
  @IsOptional() @IsIn(['hex', 'base64', 'base64url'])
  encoding?: 'hex' | 'base64' | 'base64url' = 'hex';
}
