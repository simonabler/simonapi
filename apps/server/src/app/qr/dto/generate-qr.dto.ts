import { IsEnum, IsObject, IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { QrDataType, QrFormat } from '../types';


export class GenerateQrDto {
  @IsEnum(QrDataType)
  type!: QrDataType;


  @IsObject()
  payload!: Record<string, any>; // wird service-seitig validiert


  @IsOptional()
  @IsIn(['png', 'svg'])
  format?: QrFormat = 'svg';


  @IsOptional()
  @IsInt()
  @Min(64)
  @Max(4096)
  size?: number = 512;


  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  margin?: number = 2;


  @IsOptional()
  @IsIn(['L', 'M', 'Q', 'H'])
  ecc?: 'L' | 'M' | 'Q' | 'H' = 'M';
}