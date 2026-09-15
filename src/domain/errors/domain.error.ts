import { DomainErrorCode } from './domain-error-code.enum';
import { DOMAIN_ERROR_MESSAGES } from './domain-error-messages.const';

export abstract class DomainError extends Error {
  protected constructor(
    public readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidAmountError extends DomainError {
  constructor(message: string) {
    super(DomainErrorCode.INVALID_AMOUNT, message);
  }
}

export class CurrencyMismatchError extends DomainError {
  constructor(expected: string, actual: string) {
    super(
      DomainErrorCode.CURRENCY_MISMATCH,
      `Currency mismatch: expected ${expected}, received ${actual}`,
    );
  }
}

export class InvalidIdempotencyKeyError extends DomainError {
  constructor(message: string) {
    super(DomainErrorCode.INVALID_IDEMPOTENCY_KEY, message);
  }
}

export class InvalidUserIdError extends DomainError {
  constructor() {
    super(DomainErrorCode.INVALID_USER_ID, DOMAIN_ERROR_MESSAGES.INVALID_USER_ID);
  }
}

export class InvalidPaymentMethodError extends DomainError {
  constructor() {
    super(
      DomainErrorCode.INVALID_PAYMENT_METHOD,
      DOMAIN_ERROR_MESSAGES.INVALID_PAYMENT_METHOD,
    );
  }
}

export class InvalidOperationTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(
      DomainErrorCode.INVALID_OPERATION_TRANSITION,
      `Cannot transition operation from ${from} to ${to}`,
    );
  }
}