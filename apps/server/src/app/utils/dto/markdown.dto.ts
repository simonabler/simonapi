
import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';


export class MarkdownDto {
  @ApiProperty({ description: 'Markdown-Quelltext', minLength: 0, maxLength: 200000, example: '# Titel\n\n**fett** und _kursiv_' })
  @IsString()
  @Length(0, 200000)
  markdown!: string;
}
