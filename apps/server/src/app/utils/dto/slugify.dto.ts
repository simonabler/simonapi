import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';


export class SlugifyDto {
  @ApiProperty({ description: 'Eingabetext, der in einen Slug umgewandelt wird', minLength: 1, maxLength: 10000, example: 'Äpfel & Öl – groß!' })
  @IsString()
  @Length(1, 10000)
  text!: string;


  @ApiPropertyOptional({ description: 'Kleinschreibung erzwingen', default: true })
  @IsOptional()
  @IsBoolean()
  lower?: boolean = true;


  @ApiPropertyOptional({ description: 'Nur erlaubte Zeichen, nicht-alphanumerische entfernt', default: true })
  @IsOptional()
  @IsBoolean()
  strict?: boolean = true;


  @ApiPropertyOptional({ description: 'Trennzeichen/Replacement', default: '-' })
  @IsOptional()
  @IsString()
  delimiter?: string = '-';
}
