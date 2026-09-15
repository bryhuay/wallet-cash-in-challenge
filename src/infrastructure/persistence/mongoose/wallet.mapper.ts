import { Wallet } from '@domain/entities/wallet.entity';
import { Amount } from '@domain/value-objects/amount.vo';
import { WalletPersistence } from './wallet.schema';

export function toWalletDocument(wallet: Wallet): WalletPersistence {
  return {
    id: wallet.id,
    userId: wallet.userId,
    balance: wallet.balance.value,
    currency: wallet.currency,
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt,
  };
}

export function toWallet(document: WalletPersistence): Wallet {
  return Wallet.reconstitute({
    id: document.id,
    userId: document.userId,
    balance: Amount.fromPersistence(document.balance, document.currency),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  });
}
