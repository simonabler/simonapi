import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUrl } from 'class-validator';

export class SignUploadDto {
  @ApiProperty({ required: false, description: 'Remote URL to fetch the signed file from' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  remoteUrl?: string;
}

