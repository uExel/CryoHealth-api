import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteReasonDto {
  @IsString()
  @IsNotEmpty({ message: 'Reason is required' })
  reason: string;
}
