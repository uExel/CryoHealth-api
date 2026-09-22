import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ProtocolStepsDto } from './protocol-steps.dto';

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

  @IsOptional()
  @ValidateNested()
  @Type(() => ProtocolStepsDto)
  steps?: ProtocolStepsDto;
}
