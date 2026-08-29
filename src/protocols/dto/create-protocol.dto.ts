import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProtocolDto {
  @IsString()
  @IsNotEmpty({ message: 'Slug is required' })
  slug: string;

  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  category: string;

  @IsString()
  @IsNotEmpty({ message: 'Body is required' })
  body: string;

  @IsString()
  @IsNotEmpty({
    message: "Source is required — cite where this protocol's text comes from",
  })
  source: string;

  @IsOptional()
  @IsBoolean()
  is_disaster?: boolean;
}
