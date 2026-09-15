import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Wallet } from '@domain/entities/wallet.entity';
import { WalletRepository } from '@domain/ports/wallet.repository';
import { toWallet, toWalletDocument } from './wallet.mapper';
import { WalletDocument, WalletPersistence } from './wallet.schema';

@Injectable()
export class MongooseWalletRepository implements WalletRepository {
  constructor(
    @InjectModel(WalletPersistence.name)
    private readonly model: Model<WalletDocument>,
  ) {}

  async save(wallet: Wallet): Promise<void> {
    const document = toWalletDocument(wallet);

    await this.model
      .findOneAndUpdate({ id: wallet.id }, document, {
        upsert: true,
        returnDocument: 'after',
      })
      .exec();
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    const document = await this.model.findOne({ userId }).exec();
    return document === null ? null : toWallet(document);
  }
}