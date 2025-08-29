import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';


export class IdQueryDto {
  @ApiPropertyOptional({ description: 'ID-Typ', enum: ['uuid', 'ulid'], default: 'uuid' })
  @IsOptional()
  @IsIn(['uuid', 'ulid'])
  type?: 'uuid' | 'ulid' = 'uuid';


  @ApiPropertyOptional({ description: 'Anzahl IDs', minimum: 1, maximum: 1000, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  count?: number = 1;
}
