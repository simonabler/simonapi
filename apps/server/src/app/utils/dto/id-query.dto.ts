import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';


export class IdQueryDto {
  @IsOptional()
  @IsIn(['uuid', 'ulid'])
  type?: 'uuid' | 'ulid' = 'uuid';


  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  count?: number = 1;
}