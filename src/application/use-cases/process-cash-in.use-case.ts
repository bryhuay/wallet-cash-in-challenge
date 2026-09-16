import { Operation } from '@domain/entities/operation.entity';
import { Amount } from '@domain/value-objects/amount.vo';
import { IdempotencyKey } from '@domain/value-objects/idempotency-key.vo';
import { LockProvider } from '@domain/ports/lock.provider';
import { OperationRepository } from '@domain/ports/operation.repository';
import { PaymentProvider } from '@domain/ports/payment.provider';
import {
  ProcessCashInInput,
  ProcessCashInOutput,
} from '../dto/process-cash-in.dto';
import {
  ConcurrentOperationError,
  PaymentProviderTimeoutError,
} from '../errors/application.error';
import { IDEMPOTENCY_LOCK_PREFIX } from '../constants/lock.constants';

export class ProcessCashInUseCase {
  constructor(
    private readonly operationRepository: OperationRepository,
    private readonly paymentProvider: PaymentProvider,
    private readonly lockProvider: LockProvider,
    private readonly lockTtlMs: number,
  ) {}

  async execute(input: ProcessCashInInput): Promise<ProcessCashInOutput> {
    const idempotencyKey = IdempotencyKey.create(input.idempotencyKey);
    const amount = Amount.create(input.amount, input.currency);
    const lockResource = `${IDEMPOTENCY_LOCK_PREFIX}${idempotencyKey.value}`;

    const lock = await this.lockProvider.acquire(lockResource, this.lockTtlMs);
    if (lock === null) {
      throw new ConcurrentOperationError(lockResource);
    }

    try {
      const existing =
        await this.operationRepository.findByIdempotencyKey(idempotencyKey);
      if (existing !== null) {
        return ProcessCashInUseCase.toOutput(existing);
      }

      const operation = Operation.create({
        userId: input.userId,
        amount,
        paymentMethod: input.paymentMethod,
        idempotencyKey,
      });

      try {
        const paymentResult = await this.paymentProvider.initiatePayment({
          operationId: operation.id,
          userId: operation.userId,
          amount: operation.amount,
          paymentMethod: operation.paymentMethod,
          idempotencyKey: operation.idempotencyKey.value,
        });

        if (paymentResult.accepted) {
          operation.markProcessing(paymentResult.providerReference);
        } else {
          operation.fail(paymentResult.failureReason);
        }
      } catch (error) {
        if (error instanceof PaymentProviderTimeoutError) {
          await this.operationRepository.save(operation);
          throw error;
        }

        operation.fail(
          error instanceof Error ? error.message : 'Unknown payment error',
        );
        await this.operationRepository.save(operation);
        throw error;
      }

      await this.operationRepository.save(operation);

      return ProcessCashInUseCase.toOutput(operation);
    } finally {
      await lock.release();
    }
  }

  private static toOutput(operation: Operation): ProcessCashInOutput {
    return {
      operationId: operation.id,
      userId: operation.userId,
      status: operation.status,
      amount: operation.amount.value,
      currency: operation.amount.currency,
      paymentMethod: operation.paymentMethod,
      providerReference: operation.providerReference,
    };
  }
}
