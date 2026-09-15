import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Operation } from '@domain/entities/operation.entity';
import { OperationRepository } from '@domain/ports/operation.repository';
import { IdempotencyKey } from '@domain/value-objects/idempotency-key.vo';
import { toOperation, toOperationDocument } from './operation.mapper';
import { OperationDocument, OperationPersistence } from './operation.schema';

@Injectable()
export class MongooseOperationRepository implements OperationRepository {
  constructor(
    @InjectModel(OperationPersistence.name)
    private readonly model: Model<OperationDocument>,
  ) {}

  async save(operation: Operation): Promise<void> {
    const document = toOperationDocument(operation);

    await this.model
      .findOneAndUpdate({ id: operation.id }, document, {
        upsert: true,
        returnDocument: 'after',
      })
      .exec();
  }

  async findById(id: string): Promise<Operation | null> {
    const document = await this.model.findOne({ id }).exec();
    return document === null ? null : toOperation(document);
  }

  async findByIdempotencyKey(key: IdempotencyKey): Promise<Operation | null> {
    const document = await this.model
      .findOne({ idempotencyKey: key.value })
      .exec();
    return document === null ? null : toOperation(document);
  }
}