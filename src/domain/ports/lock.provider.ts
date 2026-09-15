export interface DistributedLock {
  readonly resource: string;
  release(): Promise<void>;
}

export interface LockProvider {
  acquire(resource: string, ttlMs: number): Promise<DistributedLock | null>;
}
