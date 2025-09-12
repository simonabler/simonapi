import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateLockGroupDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateLockGroupDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
}

export class UpsertGroupMembersDto {
  @IsArray() @ArrayNotEmpty() lockIds!: string[];
}
