import { describe, expect, it, vi } from "vitest";
import {
  RateLimitExceededError,
  createRateLimiter,
  type RateLimitStore,
} from "./rate-limit";

function createMemoryStore(): RateLimitStore {
  const records = new Map<string, { count: number; expiresAt: Date }>();

  return {
    increment: vi.fn(async ({ key, expiresAt }) => {
      const previous = records.get(key);
      const next = {
        count: (previous?.count ?? 0) + 1,
        expiresAt: previous?.expiresAt ?? expiresAt,
      };
      records.set(key, next);
      return next;
    }),
  };
}

describe("database-backed request limiter", () => {
  it("uses a hashed, time-windowed key and rejects only requests over the limit", async () => {
    const store = createMemoryStore();
    const limiter = createRateLimiter({
      store,
      now: () => new Date("2026-08-11T10:00:20.000Z"),
    });
    const input = {
      namespace: "checkout",
      subject: "203.0.113.45",
      limit: 2,
      windowMs: 60_000,
    } as const;

    await expect(limiter.consume(input)).resolves.toMatchObject({
      limit: 2,
      remaining: 1,
    });
    await expect(limiter.consume(input)).resolves.toMatchObject({ remaining: 0 });
    await expect(limiter.consume(input)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
      retryAfterSeconds: 40,
    });

    const firstCall = vi.mocked(store.increment).mock.calls[0]?.[0];
    expect(firstCall?.key).toMatch(/^rl:checkout:[a-f0-9]{32}:\d+$/);
    expect(firstCall?.key).not.toContain(input.subject);
    expect(firstCall?.expiresAt.toISOString()).toBe("2026-08-11T10:01:00.000Z");
  });

  it("starts a separate atomic counter in the next fixed window", async () => {
    const store = createMemoryStore();
    const now = vi.fn<() => Date>();
    now.mockReturnValueOnce(new Date("2026-08-11T10:00:59.000Z"));
    now.mockReturnValueOnce(new Date("2026-08-11T10:01:00.000Z"));
    const limiter = createRateLimiter({ store, now });
    const input = { namespace: "checkout", subject: "user-1", limit: 1, windowMs: 60_000 };

    await expect(limiter.consume(input)).resolves.toMatchObject({ remaining: 0 });
    await expect(limiter.consume(input)).resolves.toMatchObject({ remaining: 0 });
    expect(vi.mocked(store.increment).mock.calls[0]?.[0]?.key).not.toBe(
      vi.mocked(store.increment).mock.calls[1]?.[0]?.key
    );
  });

  it("exposes a typed 429 error for API routes", () => {
    const error = new RateLimitExceededError(11);

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ code: "RATE_LIMITED", status: 429, retryAfterSeconds: 11 });
  });
});
