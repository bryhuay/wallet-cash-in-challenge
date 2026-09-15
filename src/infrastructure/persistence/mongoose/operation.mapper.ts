import { Operation } from '@domain/entities/operation.entity';
import { Amount } from '@domain/value-objects/amount.vo';
import { IdempotencyKey } from '@domain/value-objects/idempotency-key.vo';
import { OperationPersistence } from './operation.schema';

export function toOperationDocument(
  operation: Operation,
): OperationPersistence {
  return {
    id: operation.id,
    userId: operation.userId,
    amount: operation.amount.value,
    currency: operation.amount.currency,
    paymentMethod: operation.paymentMethod,
    idempotencyKey: operation.idempotencyKey.value,
    status: operation.status,
    providerReference: operation.providerReference,
    failureReason: operation.failureReason,
    createdAt: operation.createdAt,
    updatedAt: operation.updatedAt,
  };
}

export function toOperation(document: OperationPersistence): Operation {
  return Operation.reconstitute({
    id: document.id,
    userId: document.userId,
    amount: Amount.create(document.amount, document.currency),
    paymentMethod: document.paymentMethod,
    idempotencyKey: IdempotencyKey.create(document.idempotencyKey),
    status: document.status,
    providerReference: document.providerReference,
    failureReason: document.failureReason,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  });
}
