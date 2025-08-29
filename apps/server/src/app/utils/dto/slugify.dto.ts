import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';


export class SlugifyDto {
  @IsString()
  @Length(1, 10000)
  text!: string;


  @IsOptional()
  @IsBoolean()
  lower?: boolean = true;


  @IsOptional()
  @IsBoolean()
  strict?: boolean = true;


  @IsOptional()
  @IsString()
  delimiter?: string = '-';
}