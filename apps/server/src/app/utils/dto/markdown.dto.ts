
import { IsString, Length } from 'class-validator';


export class MarkdownDto {
  @IsString()
  @Length(0, 200000)
  markdown!: string;
}