import { randomUUID } from 'node:crypto';
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import {
  DistributedLock,
  LockProvider,
} from '@domain/ports/lock.provider';
import { REDIS_CLIENT } from '@config/tokens';

const RELEASE_LOCK_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

@Injectable()
export class RedisLockAdapter implements LockProvider, OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async acquire(
    resource: string,
    ttlMs: number,
  ): Promise<DistributedLock | null> {
    const token = randomUUID();
    const result = await this.redis.set(resource, token, 'PX', ttlMs, 'NX');

    if (result !== 'OK') {
      return null;
    }

    return {
      resource,
      release: async () => {
        await this.redis.eval(RELEASE_LOCK_SCRIPT, 1, resource, token);
      },
    };
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
