import {
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCaseDto {
  /** Idempotency key generated on-device: retries of the same offline case are safe. */
  @IsString() @IsNotEmpty() clientCaseId: string;
  @IsISO8601() capturedAt: string;
  @IsObject() payload: Record<string, unknown>;
  @IsOptional() @IsString() outcome?: string;
  @IsString() @IsNotEmpty() deviceId: string;
}
