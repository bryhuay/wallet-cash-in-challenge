import { IdempotencyKey } from '../value-objects/idempotency-key.vo';
import { Operation } from '../entities/operation.entity';

export interface OperationRepository {
  save(operation: Operation): Promise<void>;
  findById(id: string): Promise<Operation | null>;
  findByIdempotencyKey(key: IdempotencyKey): Promise<Operation | null>;
}
