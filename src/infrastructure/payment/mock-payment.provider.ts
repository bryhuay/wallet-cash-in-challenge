import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  InitiatePaymentCommand,
  InitiatePaymentResult,
  PaymentProvider,
} from '@domain/ports/payment.provider';
import { PaymentProviderTimeoutError } from '@application/errors/application.error';

const TIMEOUT_PAYMENT_METHOD = 'timeout';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  async initiatePayment(
    command: InitiatePaymentCommand,
  ): Promise<InitiatePaymentResult> {
    if (command.paymentMethod.trim().toLowerCase() === TIMEOUT_PAYMENT_METHOD) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      throw new PaymentProviderTimeoutError();
    }

    return {
      accepted: true,
      providerReference: `mock_${randomUUID()}`,
    };
  }
}
