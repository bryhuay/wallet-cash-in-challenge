import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { APP_CONFIG, REDIS_CLIENT } from '@config/tokens';
import { EnvironmentVariables } from '@config/env';
import { LOCK_PROVIDER } from '@domain/ports/tokens';
import { RedisLockAdapter } from './redis-lock.adapter';

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [APP_CONFIG],
      useFactory: (config: EnvironmentVariables) => new Redis(config.REDIS_URL),
    },
    {
      provide: LOCK_PROVIDER,
      useClass: RedisLockAdapter,
    },
  ],
  exports: [LOCK_PROVIDER],
})
export class LockModule {}
