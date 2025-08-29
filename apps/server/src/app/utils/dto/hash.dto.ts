import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';


export class HashDto {
  @IsString()
  @Length(1, 1000000)
  data!: string;


  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(15)
  saltRounds?: number = 10; // nur für bcrypt relevant
}