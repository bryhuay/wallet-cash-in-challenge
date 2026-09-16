import { ProcessCashInUseCase } from './process-cash-in.use-case';
import {
  ConcurrentOperationError,
  PaymentProviderTimeoutError,
} from '../errors/application.error';
import { Operation } from '@domain/entities/operation.entity';
import { Amount } from '@domain/value-objects/amount.vo';
import { IdempotencyKey } from '@domain/value-objects/idempotency-key.vo';

describe('ProcessCashInUseCase', () => {
  let useCase: ProcessCashInUseCase;
  let mockOperationRepository: any;
  let mockPaymentProvider: any;
  let mockLockProvider: any;
  let mockLock: any;

  const mockTtl = 5000;
  const validDto = {
    idempotencyKey: 'c5d0b3ec-6b7e-42ad-afe6-f93fd23bcd9b',
    userId: 'usr_ligo_123',
    amount: 100,
    currency: 'PEN',
    paymentMethod: 'DEBIT_CARD',
  };

  beforeEach(() => {
    mockLock = { release: jest.fn().mockResolvedValue(undefined) };
    mockLockProvider = { acquire: jest.fn().mockResolvedValue(mockLock) };
    mockOperationRepository = {
      findByIdempotencyKey: jest.fn(),
      save: jest.fn().mockImplementation((op) => Promise.resolve(op)),
    };
    mockPaymentProvider = { initiatePayment: jest.fn() };

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

    expect(mockLockProvider.acquire).toHaveBeenCalledWith(
      `lock:idempotency:${validDto.idempotencyKey}`,
      mockTtl,
    );
    expect(result.providerReference).toBe('mock_ref_999');
    expect(mockOperationRepository.save).toHaveBeenCalled();
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
    expect(mockPaymentProvider.initiatePayment).not.toHaveBeenCalled();
    expect(mockLock.release).toHaveBeenCalled();
  });

  it('debe lanzar ConcurrentOperationError si el lock de Redis falla', async () => {
    mockLockProvider.acquire.mockResolvedValue(null);

    await expect(useCase.execute(validDto)).rejects.toThrow(
      ConcurrentOperationError,
    );
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
    expect(mockOperationRepository.save).toHaveBeenCalled();
    expect(mockLock.release).toHaveBeenCalled();
  });
});
