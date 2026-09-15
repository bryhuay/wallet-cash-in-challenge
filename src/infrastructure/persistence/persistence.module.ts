import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_CONFIG } from '@config/tokens';
import { EnvironmentVariables } from '@config/env';
import {
  OPERATION_REPOSITORY,
  WALLET_REPOSITORY,
} from '@domain/ports/tokens';
import { MongooseOperationRepository } from './mongoose/mongoose-operation.repository';
import { MongooseWalletRepository } from './mongoose/mongoose-wallet.repository';
import {
  OperationPersistence,
  OperationSchema,
} from './mongoose/operation.schema';
import { WalletPersistence, WalletSchema } from './mongoose/wallet.schema';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: EnvironmentVariables) => ({
        uri: config.MONGODB_URI,
      }),
    }),
    MongooseModule.forFeature([
      { name: OperationPersistence.name, schema: OperationSchema },
      { name: WalletPersistence.name, schema: WalletSchema },
    ]),
  ],
  providers: [
    {
      provide: OPERATION_REPOSITORY,
      useClass: MongooseOperationRepository,
    },
    {
      provide: WALLET_REPOSITORY,
      useClass: MongooseWalletRepository,
    },
  ],
  exports: [OPERATION_REPOSITORY, WALLET_REPOSITORY],
})
export class PersistenceModule {}
