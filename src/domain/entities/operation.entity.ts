import { randomUUID } from 'node:crypto';
import {
  InvalidOperationTransitionError,
  InvalidPaymentMethodError,
  InvalidUserIdError,
} from '../errors/domain.error';
import {
  OperationStatus,
  TERMINAL_OPERATION_STATUSES,
} from '../enums/operation-status.enum';
import { Amount } from '../value-objects/amount.vo';
import { IdempotencyKey } from '../value-objects/idempotency-key.vo';

export type CreateOperationProps = {
  userId: string;
  amount: Amount;
  paymentMethod: string;
  idempotencyKey: IdempotencyKey;
};

export type ReconstituteOperationProps = {
  id: string;
  userId: string;
  amount: Amount;
  paymentMethod: string;
  idempotencyKey: IdempotencyKey;
  status: OperationStatus;
  providerReference: string | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class Operation {
  private constructor(
    readonly id: string,
    readonly userId: string,
    readonly amount: Amount,
    readonly paymentMethod: string,
    readonly idempotencyKey: IdempotencyKey,
    private _status: OperationStatus,
    private _providerReference: string | null,
    private _failureReason: string | null,
    readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateOperationProps): Operation {
    const userId = props.userId.trim();
    if (userId.length === 0) {
      throw new InvalidUserIdError();
    }

    const paymentMethod = props.paymentMethod.trim();
    if (paymentMethod.length === 0) {
      throw new InvalidPaymentMethodError();
    }

    const now = new Date();

    return new Operation(
      randomUUID(),
      userId,
      props.amount,
      paymentMethod,
      props.idempotencyKey,
      OperationStatus.PENDING,
      null,
      null,
      now,
      now,
    );
  }

  static reconstitute(props: ReconstituteOperationProps): Operation {
    return new Operation(
      props.id,
      props.userId,
      props.amount,
      props.paymentMethod,
      props.idempotencyKey,
      props.status,
      props.providerReference,
      props.failureReason,
      props.createdAt,
      props.updatedAt,
    );
  }

  get status(): OperationStatus {
    return this._status;
  }

  get providerReference(): string | null {
    return this._providerReference;
  }

  get failureReason(): string | null {
    return this._failureReason;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  isTerminal(): boolean {
    return TERMINAL_OPERATION_STATUSES.has(this._status);
  }

  markProcessing(providerReference: string): void {
    this.assertTransition(OperationStatus.PROCESSING);
    this._providerReference = providerReference;
    this._status = OperationStatus.PROCESSING;
    this.touch();
  }

  complete(): void {
    this.assertTransition(OperationStatus.COMPLETED);
    this._status = OperationStatus.COMPLETED;
    this._failureReason = null;
    this.touch();
  }

  fail(reason: string): void {
    this.assertTransition(OperationStatus.FAILED);
    this._status = OperationStatus.FAILED;
    this._failureReason = reason;
    this.touch();
  }

  private assertTransition(target: OperationStatus): void {
    const allowed = Operation.allowedTransitions[this._status];

    if (!allowed?.includes(target)) {
      throw new InvalidOperationTransitionError(this._status, target);
    }
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  private static readonly allowedTransitions: Record<
    OperationStatus,
    readonly OperationStatus[]
  > = {
    [OperationStatus.PENDING]: [
      OperationStatus.PROCESSING,
      OperationStatus.FAILED,
    ],
    [OperationStatus.PROCESSING]: [
      OperationStatus.COMPLETED,
      OperationStatus.FAILED,
    ],
    [OperationStatus.COMPLETED]: [],
    [OperationStatus.FAILED]: [],
  };
}
