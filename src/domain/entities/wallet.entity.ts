import { randomUUID } from 'node:crypto';
import { InvalidUserIdError } from '../errors/domain.error';
import { Amount } from '../value-objects/amount.vo';

export type ReconstituteWalletProps = {
  id: string;
  userId: string;
  balance: Amount;
  createdAt: Date;
  updatedAt: Date;
};

export class Wallet {
  private constructor(
    readonly id: string,
    readonly userId: string,
    private _balance: Amount,
    readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(userId: string, currency: string): Wallet {
    const normalizedUserId = userId.trim();
    if (normalizedUserId.length === 0) {
      throw new InvalidUserIdError();
    }

    const now = new Date();

    return new Wallet(
      randomUUID(),
      normalizedUserId,
      Amount.zero(currency),
      now,
      now,
    );
  }

  static reconstitute(props: ReconstituteWalletProps): Wallet {
    return new Wallet(
      props.id,
      props.userId,
      props.balance,
      props.createdAt,
      props.updatedAt,
    );
  }

  get balance(): Amount {
    return this._balance;
  }

  get currency(): string {
    return this._balance.currency;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  credit(amount: Amount): void {
    this._balance = this._balance.add(amount);
    this._updatedAt = new Date();
  }
}
