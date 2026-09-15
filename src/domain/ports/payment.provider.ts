import { Amount } from '../value-objects/amount.vo';

export type InitiatePaymentCommand = {
  operationId: string;
  userId: string;
  amount: Amount;
  paymentMethod: string;
  idempotencyKey: string;
};

export type InitiatePaymentResult =
  | {
      accepted: true;
      providerReference: string;
    }
  | {
      accepted: false;
      providerReference: string | null;
      failureReason: string;
    };

export interface PaymentProvider {
  initiatePayment(
    command: InitiatePaymentCommand,
  ): Promise<InitiatePaymentResult>;
}
