import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateSignpackDto {
  @ApiProperty({ required: false, description: 'Minutes until expiration', minimum: 1, maximum: 60 * 24 * 30 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  @Max(60 * 24 * 30)
  expiresInMinutes?: number;
}

