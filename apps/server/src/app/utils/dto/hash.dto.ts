import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';


export class HashDto {
  @ApiProperty({ description: 'Zu hashender Text/Bytes als UTF-8-String', minLength: 1, maxLength: 1_000_000, example: 'hello world' })
  @IsString()
  @Length(1, 1000000)
  data!: string;


  @ApiPropertyOptional({ description: 'Nur für bcrypt relevant', minimum: 4, maximum: 15, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(15)
  saltRounds?: number = 10; // nur für bcrypt relevant
}
