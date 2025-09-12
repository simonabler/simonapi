import { IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAccessLinkDto {
  @IsOptional() @IsString() note?: string;
  @IsDateString() validFrom!: string;
  @IsDateString() validTo!: string;
  @IsOptional() @IsArray() allowedLockIds?: string[];
  @IsOptional() @IsArray() allowedGroupIds?: string[];
  @IsOptional() @IsInt() @Min(1) @Max(100000) maxUses?: number;
  @IsOptional() @IsBoolean() requirePin?: boolean;
}
