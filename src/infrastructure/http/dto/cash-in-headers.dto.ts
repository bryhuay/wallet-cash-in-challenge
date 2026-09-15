import { IsNotEmpty, IsUUID } from 'class-validator';
import { Expose } from 'class-transformer';

export class CashInHeadersDto {
  @IsUUID('4', { message: 'x-idempotency-key must be a valid UUID v4' })
  @IsNotEmpty()
  @Expose({ name: 'x-idempotency-key' })
  'x-idempotency-key'!: string;
}