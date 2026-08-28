import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateChwProfileDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  full_name: string;

  @IsOptional()
  @IsUUID()
  district_id?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: 'Language is required' })
  language: string;
}
