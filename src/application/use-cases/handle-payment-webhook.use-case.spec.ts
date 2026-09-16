import { HandlePaymentWebhookUseCase } from './handle-payment-webhook.use-case';
import { OperationNotFoundError } from '../errors/application.error';
import { Operation } from '@domain/entities/operation.entity';
import { Wallet } from '@domain/entities/wallet.entity';
import { Amount } from '@domain/value-objects/amount.vo';
import { IdempotencyKey } from '@domain/value-objects/idempotency-key.vo';
import { OperationRepository } from '@domain/ports/operation.repository';
import { WalletRepository } from '@domain/ports/wallet.repository';
import { LockProvider, DistributedLock } from '@domain/ports/lock.provider';

describe('HandlePaymentWebhookUseCase', () => {
  let useCase: HandlePaymentWebhookUseCase;
  let mockOperationRepository: jest.Mocked<OperationRepository>;
  let mockWalletRepository: jest.Mocked<WalletRepository>;
  let mockLockProvider: jest.Mocked<LockProvider>;
  let mockLock: jest.Mocked<DistributedLock>;

  const mockTtl = 5000;
  const mockOpId = 'op_1234567890';
  const mockProviderRef = 'mock_ref_999';

  beforeEach(() => {
    mockLock = {
      resource: 'lock:resource',
      release: jest.fn().mockResolvedValue(undefined),
    };

    mockLockProvider = {
      acquire: jest.fn().mockResolvedValue(mockLock),
    };

    mockOperationRepository = {
      findById: jest.fn(),
      save: jest
        .fn()
        .mockImplementation((op: Operation) => Promise.resolve(op)),
    } as unknown as jest.Mocked<OperationRepository>;

    mockWalletRepository = {
      findByUserId: jest.fn(),
      save: jest.fn().mockImplementation((w: Wallet) => Promise.resolve(w)),
    };

    useCase = new HandlePaymentWebhookUseCase(
      mockOperationRepository,
      mockWalletRepository,
      mockLockProvider,
      mockTtl,
    );
  });

  it('debe acreditar saldo y completar la operación ante outcome succeeded', async () => {
    const operation = Operation.create({
      userId: 'usr_123',
      amount: Amount.create(100, 'PEN'),
      paymentMethod: 'DEBIT_CARD',
      idempotencyKey: IdempotencyKey.create(
        'c5d0b3ec-6b7e-42ad-afe6-f93fd23bcd9b',
      ),
    });
    operation.markProcessing(mockProviderRef);

    mockOperationRepository.findById.mockResolvedValue(operation);
    mockWalletRepository.findByUserId.mockResolvedValue(
      Wallet.create('usr_123', 'PEN'),
    );

    const result = await useCase.execute({
      operationId: mockOpId,
      providerReference: mockProviderRef,
      outcome: 'succeeded',
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.credited).toBe(true);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockWalletRepository.save).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLock.release).toHaveBeenCalled();
  });

  it('debe ser idempotente ante webhooks duplicados (no reacreditar saldo)', async () => {
    const operation = Operation.create({
      userId: 'usr_123',
      amount: Amount.create(100, 'PEN'),
      paymentMethod: 'DEBIT_CARD',
      idempotencyKey: IdempotencyKey.create(
        'c5d0b3ec-6b7e-42ad-afe6-f93fd23bcd9b',
      ),
    });
    operation.markProcessing(mockProviderRef);
    operation.complete(); // Ya en estado terminal COMPLETED

    mockOperationRepository.findById.mockResolvedValue(operation);

    const result = await useCase.execute({
      operationId: mockOpId,
      providerReference: mockProviderRef,
      outcome: 'succeeded',
    });

    expect(result.credited).toBe(false);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockWalletRepository.save).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLockProvider.acquire).not.toHaveBeenCalled();
  });

  it('debe marcar la operación como FAILED y no modificar la billetera ante fallo', async () => {
    const operation = Operation.create({
      userId: 'usr_123',
      amount: Amount.create(100, 'PEN'),
      paymentMethod: 'DEBIT_CARD',
      idempotencyKey: IdempotencyKey.create(
        'c5d0b3ec-6b7e-42ad-afe6-f93fd23bcd9b',
      ),
    });
    operation.markProcessing(mockProviderRef);

    mockOperationRepository.findById.mockResolvedValue(operation);

    const result = await useCase.execute({
      operationId: mockOpId,
      providerReference: mockProviderRef,
      outcome: 'failed',
      failureReason: 'Insufficient funds',
    });

    expect(result.status).toBe('FAILED');
    expect(result.credited).toBe(false);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockWalletRepository.save).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLock.release).toHaveBeenCalled();
  });

  it('debe lanzar OperationNotFoundError si la operación no existe', async () => {
    mockOperationRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        operationId: mockOpId,
        providerReference: mockProviderRef,
        outcome: 'succeeded',
      }),
    ).rejects.toThrow(OperationNotFoundError);
  });
});
