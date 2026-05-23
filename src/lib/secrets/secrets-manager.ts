/**
 * b4skills Secrets Manager
 *
 * Provides a unified interface for loading secrets at runtime.
 * Priority order:
 *   1. AWS Secrets Manager (if AWS_REGION + AWS_SECRET_ARN are set)
 *   2. Environment variables (fallback / local dev)
 *
 * Usage:
 *   const secrets = await SecretsManager.load();
 *   const dbUrl = secrets.get("DATABASE_URL");
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SecretKey =
  | "DATABASE_URL"
  | "JWT_SECRET"
  | "REFRESH_SECRET"
  | "OPENAI_API_KEY"
  | "ANTHROPIC_API_KEY"
  | "GEMINI_API_KEY"
  | "RESEND_API_KEY"
  | "STRIPE_SECRET_KEY"
  | "STRIPE_WEBHOOK_SECRET"
  | "SENTRY_DSN"
  | "REDIS_URL"
  | "DATA_WAREHOUSE_BUCKET"
  | "WEBHOOK_SIGNING_SECRET"
  | "OIDC_CLIENT_SECRET"
  | "ENCRYPTION_KEY";

export interface SecretStore {
  get(key: SecretKey): string | undefined;
  require(key: SecretKey): string;
  has(key: SecretKey): boolean;
  toRecord(): Record<string, string>;
}

// ---------------------------------------------------------------------------
// In-memory store (populated once at startup)
// ---------------------------------------------------------------------------

class InMemorySecretStore implements SecretStore {
  private store: Map<string, string>;

  constructor(data: Record<string, string>) {
    this.store = new Map(Object.entries(data));
  }

  get(key: SecretKey): string | undefined {
    return this.store.get(key) ?? process.env[key];
  }

  require(key: SecretKey): string {
    const val = this.get(key);
    if (!val) throw new Error(`[SecretsManager] Required secret "${key}" is missing`);
    return val;
  }

  has(key: SecretKey): boolean {
    return this.store.has(key) || Boolean(process.env[key]);
  }

  toRecord(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [k, v] of this.store) result[k] = v;
    return result;
  }
}

// ---------------------------------------------------------------------------
// AWS Secrets Manager loader
// ---------------------------------------------------------------------------

async function loadFromAWS(secretArn: string, region: string): Promise<Record<string, string>> {
  try {
    // @ts-ignore — @aws-sdk/client-secrets-manager optional dependency
    const { SecretsManagerClient, GetSecretValueCommand } = await import("@aws-sdk/client-secrets-manager");
    const client = new SecretsManagerClient({ region });
    const command = new GetSecretValueCommand({ SecretId: secretArn });
    const response = await client.send(command);

    const raw = response.SecretString ?? "";
    if (!raw) return {};

    try {
      // Secrets Manager stores as JSON object
      return JSON.parse(raw) as Record<string, string>;
    } catch {
      // Or as a single string value with a default key
      return { SECRET_VALUE: raw };
    }
  } catch (err) {
    console.warn("[SecretsManager] AWS load failed, falling back to env vars:", (err as Error).message);
    return {};
  }
}

// ---------------------------------------------------------------------------
// Environment variable fallback
// ---------------------------------------------------------------------------

function loadFromEnv(): Record<string, string> {
  const keys: SecretKey[] = [
    "DATABASE_URL",
    "JWT_SECRET",
    "REFRESH_SECRET",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GEMINI_API_KEY",
    "RESEND_API_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "SENTRY_DSN",
    "REDIS_URL",
    "DATA_WAREHOUSE_BUCKET",
    "WEBHOOK_SIGNING_SECRET",
    "OIDC_CLIENT_SECRET",
    "ENCRYPTION_KEY",
  ];

  const result: Record<string, string> = {};
  for (const key of keys) {
    const val = process.env[key];
    if (val) result[key] = val;
  }
  return result;
}

// ---------------------------------------------------------------------------
// SecretsManager class (singleton)
// ---------------------------------------------------------------------------

let _instance: SecretStore | null = null;
let _loading: Promise<SecretStore> | null = null;

export class SecretsManager {
  /**
   * Load secrets once. Subsequent calls return the cached store.
   * Call this early in startServer() before any services initialise.
   */
  static async load(): Promise<SecretStore> {
    if (_instance) return _instance;
    if (_loading) return _loading;

    _loading = (async () => {
      let data: Record<string, string> = {};

      const secretArn = process.env.AWS_SECRET_ARN;
      const awsRegion = process.env.AWS_REGION;

      if (secretArn && awsRegion) {
        console.log("[SecretsManager] Loading secrets from AWS Secrets Manager…");
        const awsSecrets = await loadFromAWS(secretArn, awsRegion);
        data = { ...awsSecrets };
        console.log(`[SecretsManager] Loaded ${Object.keys(awsSecrets).length} secrets from AWS`);
      } else {
        console.log("[SecretsManager] AWS_SECRET_ARN not set — using environment variables");
      }

      // Merge env vars as fallback for anything not in AWS
      const envSecrets = loadFromEnv();
      data = { ...envSecrets, ...data }; // AWS takes precedence

      _instance = new InMemorySecretStore(data);
      return _instance;
    })();

    return _loading;
  }

  /**
   * Synchronous getter — only works after load() has been awaited.
   * Throws if the store hasn't been initialised yet.
   */
  static get(key: SecretKey): string | undefined {
    if (!_instance) {
      // Fallback to env for compatibility
      return process.env[key];
    }
    return _instance.get(key);
  }

  static require(key: SecretKey): string {
    const val = SecretsManager.get(key);
    if (!val) throw new Error(`[SecretsManager] Required secret "${key}" is not configured`);
    return val;
  }

  static has(key: SecretKey): boolean {
    if (!_instance) return Boolean(process.env[key]);
    return _instance.has(key);
  }

  /**
   * Reset the cached store (useful for testing).
   */
  static reset(): void {
    _instance = null;
    _loading = null;
  }

  /**
   * Rotate a secret by reloading from AWS.
   * Only works when AWS_SECRET_ARN is configured.
   */
  static async rotate(): Promise<void> {
    const secretArn = process.env.AWS_SECRET_ARN;
    const awsRegion = process.env.AWS_REGION;
    if (!secretArn || !awsRegion) {
      console.warn("[SecretsManager] Cannot rotate — AWS_SECRET_ARN not configured");
      return;
    }

    console.log("[SecretsManager] Rotating secrets…");
    SecretsManager.reset();
    await SecretsManager.load();
    console.log("[SecretsManager] Secret rotation complete");
  }
}

export default SecretsManager;
