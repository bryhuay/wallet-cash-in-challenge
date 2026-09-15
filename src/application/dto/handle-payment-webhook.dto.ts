import { OperationStatus } from '@domain/enums/operation-status.enum';

export type PaymentWebhookOutcome = 'succeeded' | 'failed';

export type HandlePaymentWebhookInput = {
  operationId: string;
  providerReference: string;
  outcome: PaymentWebhookOutcome;
  failureReason?: string;
};

export type HandlePaymentWebhookOutput = {
  operationId: string;
  status: OperationStatus;
  credited: boolean;
};
