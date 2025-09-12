import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LockProviderType } from '../core/lock.types';

export class CreateLockDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsEnum(LockProviderType) providerType!: LockProviderType;
  @IsOptional() providerConfig?: Record<string, any>;
  @IsOptional() @IsString() description?: string;
}

export class UpdateLockDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(LockProviderType) providerType?: LockProviderType;
  @IsOptional() providerConfig?: Record<string, any>;
  @IsOptional() @IsBoolean() active?: boolean;
}
