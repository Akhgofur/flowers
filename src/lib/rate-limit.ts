import { createHash } from "node:crypto";
import { dbConnect } from "@/lib/mongodb";
import { RateLimitModel } from "@/models/RateLimit";

export type RateLimitPolicy = {
  namespace: string;
  subject: string;
  limit: number;
  windowMs: number;
};

export type RateLimitIncrement = {
  key: string;
  expiresAt: Date;
};

export type RateLimitRecord = {
  count: number;
  expiresAt: Date;
};

export type RateLimitStore = {
  increment(input: RateLimitIncrement): Promise<RateLimitRecord>;
};

export type RateLimitDecision = {
  limit: number;
  remaining: number;
  resetAt: Date;
};

type RateLimiterDependencies = {
  store?: RateLimitStore;
  now?: () => Date;
};

export class RateLimitExceededError extends Error {
  readonly code = "RATE_LIMITED";
  readonly status = 429;

  constructor(readonly retryAfterSeconds: number) {
    super("Too many requests. Please try again shortly.");
    this.name = "RateLimitExceededError";
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11_000
  );
}

function normalizePositiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive safe integer.`);
  }

  return value;
}

function hashSubject(subject: string): string {
  const normalized = subject.trim();
  if (!normalized) throw new Error("Rate limit subject is required.");

  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

export function buildRateLimitKey(
  namespace: string,
  subject: string,
  windowStart: number,
  windowMs: number
): string {
  const normalizedNamespace = namespace.trim().toLowerCase();
  if (!/^[a-z0-9:_-]{1,64}$/.test(normalizedNamespace)) {
    throw new Error("Rate limit namespace must be URL-safe and no longer than 64 characters.");
  }

  const currentWindow = Math.floor(windowStart / windowMs);
  return `rl:${normalizedNamespace}:${hashSubject(subject)}:${currentWindow}`;
}

const mongoRateLimitStore: RateLimitStore = {
  async increment({ key, expiresAt }): Promise<RateLimitRecord> {
    await dbConnect();

    const update = {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt },
    };

    try {
      const record = await RateLimitModel.findOneAndUpdate({ key }, update, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      })
        .lean()
        .exec();

      if (!record) throw new Error("Rate limit counter was not persisted.");
      return { count: record.count, expiresAt: record.expiresAt };
    } catch (error) {
      // A racing first write can lose the upsert race against the unique key.
      // Retrying without upsert increments the winner's one canonical counter.
      if (!isDuplicateKeyError(error)) throw error;

      const record = await RateLimitModel.findOneAndUpdate(
        { key },
        { $inc: { count: 1 } },
        { new: true }
      )
        .lean()
        .exec();

      if (!record) throw error;
      return { count: record.count, expiresAt: record.expiresAt };
    }
  },
};

export function createRateLimiter(dependencies: RateLimiterDependencies = {}) {
  const store = dependencies.store ?? mongoRateLimitStore;
  const now = dependencies.now ?? (() => new Date());

  return {
    async consume(policy: RateLimitPolicy): Promise<RateLimitDecision> {
      const limit = normalizePositiveInteger(policy.limit, "Rate limit");
      const windowMs = normalizePositiveInteger(policy.windowMs, "Rate limit window");
      const currentTime = now();
      const timestamp = currentTime.getTime();

      if (Number.isNaN(timestamp)) throw new Error("Rate limiter clock returned an invalid date.");

      const windowStart = Math.floor(timestamp / windowMs) * windowMs;
      const resetAt = new Date(windowStart + windowMs);
      const key = buildRateLimitKey(policy.namespace, policy.subject, windowStart, windowMs);
      const record = await store.increment({ key, expiresAt: resetAt });
      const remaining = Math.max(0, limit - record.count);

      if (record.count > limit) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((record.expiresAt.getTime() - timestamp) / 1_000)
        );
        throw new RateLimitExceededError(retryAfterSeconds);
      }

      return { limit, remaining, resetAt: record.expiresAt };
    },
  };
}

export const rateLimiter = createRateLimiter();
