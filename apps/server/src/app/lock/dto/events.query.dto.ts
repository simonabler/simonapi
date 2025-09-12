import { IsDateString, IsOptional, IsString } from 'class-validator';
export class EventsQueryDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() lockId?: string;
  @IsOptional() @IsString() linkId?: string;
  @IsOptional() @IsString() result?: 'SUCCESS'|'FAILED';
}
