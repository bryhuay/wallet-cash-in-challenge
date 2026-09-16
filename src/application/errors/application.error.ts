import { ApplicationErrorCode } from './error-codes.enum';

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;

  constructor(code: ApplicationErrorCode, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

export class ConcurrentOperationError extends ApplicationError {
  constructor(resource: string) {
    super(
      ApplicationErrorCode.CONCURRENT_OPERATION,
      `Could not acquire lock for resource: ${resource}`,
    );
  }
}

export class OperationNotFoundError extends ApplicationError {
  constructor(operationId: string) {
    super(
      ApplicationErrorCode.OPERATION_NOT_FOUND,
      `Operation not found: ${operationId}`,
    );
  }
}

export class PaymentProviderTimeoutError extends ApplicationError {
  constructor() {
    super(
      ApplicationErrorCode.PAYMENT_PROVIDER_TIMEOUT,
      'Payment provider timed out',
    );
  }
}
