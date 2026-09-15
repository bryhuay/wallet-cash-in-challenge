import { Module } from '@nestjs/common';
import { PAYMENT_PROVIDER } from '@domain/ports/tokens';
import { MockPaymentProvider } from './mock-payment.provider';

@Module({
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      useClass: MockPaymentProvider,
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentModule {}
