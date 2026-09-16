import { ProcessCashInUseCase } from './process-cash-in.use-case';
import {
  ConcurrentOperationError,
  PaymentProviderTimeoutError,
} from '../errors/application.error';
import { Operation } from '@domain/entities/operation.entity';
import { Amount } from '@domain/value-objects/amount.vo';
import { IdempotencyKey } from '@domain/value-objects/idempotency-key.vo';
import { OperationRepository } from '@domain/ports/operation.repository';
import { PaymentProvider } from '@domain/ports/payment.provider';
import { LockProvider, DistributedLock } from '@domain/ports/lock.provider';

describe('ProcessCashInUseCase', () => {
  let useCase: ProcessCashInUseCase;
  let mockOperationRepository: jest.Mocked<OperationRepository>;
  let mockPaymentProvider: jest.Mocked<PaymentProvider>;
  let mockLockProvider: jest.Mocked<LockProvider>;
  let mockLock: jest.Mocked<DistributedLock>;

  const mockTtl = 5000;
  const validDto = {
    idempotencyKey: 'c5d0b3ec-6b7e-42ad-afe6-f93fd23bcd9b',
    userId: 'usr_ligo_123',
    amount: 100,
    currency: 'PEN',
    paymentMethod: 'DEBIT_CARD' as const,
  };

  beforeEach(() => {
    mockLock = {
      resource: 'lock:resource',
      release: jest.fn().mockResolvedValue(undefined),
    };

    mockLockProvider = {
      acquire: jest.fn().mockResolvedValue(mockLock),
    };

    mockOperationRepository = {
      findByIdempotencyKey: jest.fn(),
      save: jest
        .fn()
        .mockImplementation((op: Operation) => Promise.resolve(op)),
    } as unknown as jest.Mocked<OperationRepository>;

    mockPaymentProvider = {
      initiatePayment: jest.fn(),
    };

    useCase = new ProcessCashInUseCase(
      mockOperationRepository,
      mockPaymentProvider,
      mockLockProvider,
      mockTtl,
    );
  });

  it('debe registrar y procesar un Cash-In exitosamente', async () => {
    mockOperationRepository.findByIdempotencyKey.mockResolvedValue(null);
    mockPaymentProvider.initiatePayment.mockResolvedValue({
      accepted: true,
      providerReference: 'mock_ref_999',
    });

    const result = await useCase.execute(validDto);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLockProvider.acquire).toHaveBeenCalledWith(
      `lock:idempotency:${validDto.idempotencyKey}`,
      mockTtl,
    );
    expect(result.providerReference).toBe('mock_ref_999');

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockOperationRepository.save).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLock.release).toHaveBeenCalled();
  });

  it('debe ser idempotente y retornar la operación existente sin volver a cobrar', async () => {
    const existingOp = Operation.create({
      userId: validDto.userId,
      amount: Amount.create(validDto.amount, validDto.currency),
      paymentMethod: validDto.paymentMethod,
      idempotencyKey: IdempotencyKey.create(validDto.idempotencyKey),
    });
    existingOp.markProcessing('mock_ref_existing');

    mockOperationRepository.findByIdempotencyKey.mockResolvedValue(existingOp);

    const result = await useCase.execute(validDto);

    expect(result.providerReference).toBe('mock_ref_existing');

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockPaymentProvider.initiatePayment).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLock.release).toHaveBeenCalled();
  });

  it('debe lanzar ConcurrentOperationError si el lock de Redis falla', async () => {
    mockLockProvider.acquire.mockResolvedValue(null);

    await expect(useCase.execute(validDto)).rejects.toThrow(
      ConcurrentOperationError,
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockOperationRepository.findByIdempotencyKey).not.toHaveBeenCalled();
  });

  it('debe manejar timeouts del proveedor de pagos y persistir la operación', async () => {
    mockOperationRepository.findByIdempotencyKey.mockResolvedValue(null);
    mockPaymentProvider.initiatePayment.mockRejectedValue(
      new PaymentProviderTimeoutError(),
    );

    await expect(useCase.execute(validDto)).rejects.toThrow(
      PaymentProviderTimeoutError,
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockOperationRepository.save).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLock.release).toHaveBeenCalled();
  });
});
