import { InvalidIdempotencyKeyError } from '../errors/domain.error';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INVALID_KEY_MESSAGE = 'Idempotency-Key must be a valid UUID v4';

export class IdempotencyKey {
  private constructor(readonly value: string) {}

  static create(value: string): IdempotencyKey {
    const normalized = value.trim().toLowerCase();

    if (!UUID_V4_REGEX.test(normalized)) {
      throw new InvalidIdempotencyKeyError(INVALID_KEY_MESSAGE);
    }

    return new IdempotencyKey(normalized);
  }

  equals(other: IdempotencyKey): boolean {
    return this.value === other.value;
  }
}