import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'wallets', timestamps: false, versionKey: false })
export class WalletPersistence {
  @Prop({ type: String, required: true, unique: true, index: true })
  id!: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  userId!: string;

  @Prop({ type: Number, required: true })
  balance!: number;

  @Prop({ type: String, required: true })
  currency!: string;

  @Prop({ type: Date, required: true })
  createdAt!: Date;

  @Prop({ type: Date, required: true })
  updatedAt!: Date;
}

export type WalletDocument = HydratedDocument<WalletPersistence>;

export const WalletSchema = SchemaFactory.createForClass(WalletPersistence);
