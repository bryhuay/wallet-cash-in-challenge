import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ProcessCashInUseCase } from '@application/use-cases/process-cash-in.use-case';
import { HandlePaymentWebhookUseCase } from '@application/use-cases/handle-payment-webhook.use-case';
import { AppConfigModule } from '@config/config.module';
import { APP_CONFIG } from '@config/tokens';
import { EnvironmentVariables } from '@config/env';
import {
  LOCK_PROVIDER,
  OPERATION_REPOSITORY,
  PAYMENT_PROVIDER,
  WALLET_REPOSITORY,
} from '@domain/ports/tokens';
import { OperationRepository } from '@domain/ports/operation.repository';
import { WalletRepository } from '@domain/ports/wallet.repository';
import { PaymentProvider } from '@domain/ports/payment.provider';
import { LockProvider } from '@domain/ports/lock.provider';
import { CashInController } from '@infrastructure/http/cash-in.controller';
import { PaymentWebhookController } from '@infrastructure/http/payment-webhook.controller';
import { GlobalExceptionFilter } from '@infrastructure/http/filters/global-exception.filter';
import { TransformInterceptor } from '@infrastructure/http/interceptors/transform.interceptor';
import { LoggingAndCorrelationMiddleware } from '@infrastructure/http/middlewares/logging-and-correlation.middleware';
import { PersistenceModule } from '@infrastructure/persistence/persistence.module';
import { LockModule } from '@infrastructure/lock/lock.module';
import { PaymentModule } from '@infrastructure/payment/payment.module';

@Module({
  imports: [AppConfigModule, PersistenceModule, LockModule, PaymentModule],
  controllers: [CashInController, PaymentWebhookController],
  providers: [
    {
      provide: ProcessCashInUseCase,
      inject: [
        OPERATION_REPOSITORY,
        PAYMENT_PROVIDER,
        LOCK_PROVIDER,
        APP_CONFIG,
      ],
      useFactory: (
        operationRepository: OperationRepository,
        paymentProvider: PaymentProvider,
        lockProvider: LockProvider,
        config: EnvironmentVariables,
      ) =>
        new ProcessCashInUseCase(
          operationRepository,
          paymentProvider,
          lockProvider,
          config.LOCK_TTL_MS,
        ),
    },
    {
      provide: HandlePaymentWebhookUseCase,
      inject: [
        OPERATION_REPOSITORY,
        WALLET_REPOSITORY,
        LOCK_PROVIDER,
        APP_CONFIG,
      ],
      useFactory: (
        operationRepository: OperationRepository,
        walletRepository: WalletRepository,
        lockProvider: LockProvider,
        config: EnvironmentVariables,
      ) =>
        new HandlePaymentWebhookUseCase(
          operationRepository,
          walletRepository,
          lockProvider,
          config.LOCK_TTL_MS,
        ),
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingAndCorrelationMiddleware).forRoutes('*');
  }
}
