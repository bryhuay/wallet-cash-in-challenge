import { Operation } from '@domain/entities/operation.entity';
import { Wallet } from '@domain/entities/wallet.entity';
import { LockProvider } from '@domain/ports/lock.provider';
import { OperationRepository } from '@domain/ports/operation.repository';
import { WalletRepository } from '@domain/ports/wallet.repository';
import {
  HandlePaymentWebhookInput,
  HandlePaymentWebhookOutput,
} from '../dto/handle-payment-webhook.dto';
import {
  ConcurrentOperationError,
  OperationNotFoundError,
} from '../errors/application.error';
import {
  WALLET_LOCK_PREFIX,
  DEFAULT_PAYMENT_FAILURE_REASON,
  WEBHOOK_OUTCOME_SUCCEEDED,
} from '../constants/lock.constants';

export class HandlePaymentWebhookUseCase {
  constructor(
    private readonly operationRepository: OperationRepository,
    private readonly walletRepository: WalletRepository,
    private readonly lockProvider: LockProvider,
    private readonly lockTtlMs: number,
  ) {}

  async execute(
    input: HandlePaymentWebhookInput,
  ): Promise<HandlePaymentWebhookOutput> {
    const operation = await this.operationRepository.findById(
      input.operationId,
    );

    if (operation === null) {
      throw new OperationNotFoundError(input.operationId);
    }

    if (operation.isTerminal()) {
      return HandlePaymentWebhookUseCase.toOutput(operation, false);
    }

    const lockResource = `${WALLET_LOCK_PREFIX}${operation.userId}`;
    const lock = await this.lockProvider.acquire(lockResource, this.lockTtlMs);

    if (lock === null) {
      throw new ConcurrentOperationError(lockResource);
    }

    try {
      const isSucceeded = input.outcome === WEBHOOK_OUTCOME_SUCCEEDED;

      if (isSucceeded) {
        operation.complete();

        const wallet = await this.getOrCreateWallet(operation);
        wallet.credit(operation.amount);
        await this.walletRepository.save(wallet);
      } else {
        operation.fail(input.failureReason ?? DEFAULT_PAYMENT_FAILURE_REASON);
      }

      await this.operationRepository.save(operation);

      return HandlePaymentWebhookUseCase.toOutput(operation, isSucceeded);
    } finally {
      await lock.release();
    }
  }

  private async getOrCreateWallet(operation: Operation): Promise<Wallet> {
    const existing = await this.walletRepository.findByUserId(operation.userId);

    if (existing !== null) {
      return existing;
    }

    return Wallet.create(operation.userId, operation.amount.currency);
  }

  private static toOutput(
    operation: Operation,
    credited: boolean,
  ): HandlePaymentWebhookOutput {
    return {
      operationId: operation.id,
      status: operation.status,
      credited,
    };
  }
}