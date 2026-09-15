import { OperationStatus } from '@domain/enums/operation-status.enum';

export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

export type CashInHttpRequestDto = {
  user_id: string;
  amount: number;
  currency: string;
  payment_method: string;
};

export type ProcessCashInInput = {
  idempotencyKey: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
};

export type ProcessCashInOutput = {
  operationId: string;
  userId: string;
  status: OperationStatus;
  amount: number;
  currency: string;
  paymentMethod: string;
  providerReference: string | null;
};
