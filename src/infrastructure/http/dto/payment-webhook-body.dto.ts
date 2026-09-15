import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaymentWebhookOutcome } from '@application/dto/handle-payment-webhook.dto';

export class PaymentWebhookBodyDto {
  @IsUUID('4')
  operation_id!: string;

  @IsString()
  @IsNotEmpty()
  provider_reference!: string;

  @IsIn(['succeeded', 'failed'])
  outcome!: PaymentWebhookOutcome;

  @IsOptional()
  @IsString()
  failure_reason?: string;
}
