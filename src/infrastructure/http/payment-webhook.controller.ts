import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { HandlePaymentWebhookUseCase } from '@application/use-cases/handle-payment-webhook.use-case';
import { PaymentWebhookBodyDto } from './dto/payment-webhook-body.dto';
import { PaymentWebhookResponseDto } from './dto/payment-webhook-response.dto';

@Controller('webhooks')
export class PaymentWebhookController {
  constructor(
    private readonly handlePaymentWebhook: HandlePaymentWebhookUseCase,
  ) {}

  @Post('payment')
  @HttpCode(HttpStatus.OK)
  async handlePayment(
    @Body() body: PaymentWebhookBodyDto,
  ): Promise<PaymentWebhookResponseDto> {
    const result = await this.handlePaymentWebhook.execute({
      operationId: body.operation_id,
      providerReference: body.provider_reference,
      outcome: body.outcome,
      failureReason: body.failure_reason,
    });

    return {
      operation_id: result.operationId,
      status: result.status,
      credited: result.credited,
    };
  }
}