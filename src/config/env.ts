export type NodeEnvironment = 'development' | 'production' | 'test';

export type EnvironmentVariables = {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  MONGODB_URI: string;
  REDIS_URL: string;
  PAYMENT_PROVIDER_BASE_URL: string;
  PAYMENT_PROVIDER_API_KEY: string;
  LOCK_TTL_MS: number;
};

const NODE_ENVIRONMENTS: ReadonlySet<string> = new Set([
  'development',
  'production',
  'test',
]);

export function loadEnv(
  source: NodeJS.ProcessEnv = process.env,
): EnvironmentVariables {
  const nodeEnv = source.NODE_ENV ?? 'development';

  return {
    NODE_ENV: NODE_ENVIRONMENTS.has(nodeEnv)
      ? (nodeEnv as NodeEnvironment)
      : 'development',
    PORT: parsePositiveInt(source.PORT, 3000),
    MONGODB_URI:
      source.MONGODB_URI ?? 'mongodb://localhost:27017/wallet-cashin',
    REDIS_URL: source.REDIS_URL ?? 'redis://localhost:6379',
    PAYMENT_PROVIDER_BASE_URL: source.PAYMENT_PROVIDER_BASE_URL ?? '',
    PAYMENT_PROVIDER_API_KEY: source.PAYMENT_PROVIDER_API_KEY ?? '',
    LOCK_TTL_MS: parsePositiveInt(source.LOCK_TTL_MS, 10_000),
  };
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
