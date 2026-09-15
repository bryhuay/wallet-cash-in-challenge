import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OperationStatus } from '@domain/enums/operation-status.enum';

@Schema({ collection: 'operations', timestamps: false, versionKey: false })
export class OperationPersistence {
  @Prop({ type: String, required: true, unique: true, index: true })
  id!: string;

  @Prop({ type: String, required: true, index: true })
  userId!: string;

  @Prop({ type: Number, required: true })
  amount!: number;

  @Prop({ type: String, required: true })
  currency!: string;

  @Prop({ type: String, required: true })
  paymentMethod!: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  idempotencyKey!: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(OperationStatus),
  })
  status!: OperationStatus;

  @Prop({ type: String, default: null })
  providerReference!: string | null;

  @Prop({ type: String, default: null })
  failureReason!: string | null;

  @Prop({ type: Date, required: true })
  createdAt!: Date;

  @Prop({ type: Date, required: true })
  updatedAt!: Date;
}

export type OperationDocument = HydratedDocument<OperationPersistence>;

export const OperationSchema =
  SchemaFactory.createForClass(OperationPersistence);
