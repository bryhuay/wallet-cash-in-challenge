import {
  CurrencyMismatchError,
  InvalidAmountError,
} from '../errors/domain.error';

const MINOR_UNITS_PER_MAJOR = 100;
const ISO_4217_CURRENCY_REGEX = /^[A-Z]{3}$/;

const ERR_NON_POSITIVE = 'amount must be a finite number greater than zero';
const ERR_INVALID_CURRENCY = 'currency must be a 3-letter ISO code';
const ERR_DECIMALS_LIMIT = 'amount cannot have more than 2 decimal places';

export class Amount {
  private constructor(
    private readonly minorUnits: number,
    readonly currency: string,
  ) {}

  static create(value: number, currency: string): Amount {
    if (!Number.isFinite(value) || value <= 0) {
      throw new InvalidAmountError(ERR_NON_POSITIVE);
    }

    const normalizedCurrency = currency.trim().toUpperCase();
    if (!ISO_4217_CURRENCY_REGEX.test(normalizedCurrency)) {
      throw new InvalidAmountError(ERR_INVALID_CURRENCY);
    }

    const minorUnits = Math.round(value * MINOR_UNITS_PER_MAJOR);
    if (Math.abs(value * MINOR_UNITS_PER_MAJOR - minorUnits) > 1e-6) {
      throw new InvalidAmountError(ERR_DECIMALS_LIMIT);
    }

    return new Amount(minorUnits, normalizedCurrency);
  }

  static zero(currency: string): Amount {
    const normalizedCurrency = currency.trim().toUpperCase();
    if (!ISO_4217_CURRENCY_REGEX.test(normalizedCurrency)) {
      throw new InvalidAmountError(ERR_INVALID_CURRENCY);
    }
    return new Amount(0, normalizedCurrency);
  }

  static fromPersistence(minorUnits: number, currency: string): Amount {
    return new Amount(minorUnits, currency);
  }

  get value(): number {
    return this.minorUnits / MINOR_UNITS_PER_MAJOR;
  }

  get rawMinorUnits(): number {
    return this.minorUnits;
  }

  add(other: Amount): Amount {
    this.ensureSameCurrency(other);
    return new Amount(this.minorUnits + other.minorUnits, this.currency);
  }

  equals(other: Amount): boolean {
    return (
      this.minorUnits === other.minorUnits && this.currency === other.currency
    );
  }

  private ensureSameCurrency(other: Amount): void {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError(this.currency, other.currency);
    }
  }
}