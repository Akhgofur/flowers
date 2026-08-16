import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const orderService = vi.hoisted(() => ({
  createPendingOrder: vi.fn(),
}));
const notifications = vi.hoisted(() => ({
  orderNotificationService: { notifyNewOrder: vi.fn() },
}));
const outbox = vi.hoisted(() => ({
  orderNotificationOutboxService: { deliverForOrder: vi.fn() },
}));

const rateLimit = vi.hoisted(() => {
  class MockRateLimitExceededError extends Error {
    readonly code = "RATE_LIMITED";
    readonly status = 429;

    constructor(readonly retryAfterSeconds: number) {
      super("Too many requests");
    }
  }

  return {
    rateLimiter: { consume: vi.fn() },
    RateLimitExceededError: MockRateLimitExceededError,
  };
});

vi.mock("@/lib/services/order-service", () => ({ orderService }));
vi.mock("@/lib/services/order-notification-service", () => notifications);
vi.mock("@/lib/services/order-notification-outbox-service", () => outbox);
vi.mock("@/lib/rate-limit", () => rateLimit);

import { POST } from "./route";

const validCheckout = {
  locale: "ru",
  fulfilment: "delivery",
  customer: {
    fullName: "Ali Valiyev",
    phone: "+998901234567",
    address: "Toshkent shahri, Chilonzor tumani",
  },
  paymentMethod: "cash_on_delivery",
  items: [{ productId: "507f1f77bcf86cd799439011", quantity: 2 }],
};

function postJson(body: unknown, headers: HeadersInit = {}) {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimit.rateLimiter.consume.mockResolvedValue({
      limit: 5,
      remaining: 4,
      resetAt: new Date("2026-08-11T10:15:00.000Z"),
    });
    notifications.orderNotificationService.notifyNewOrder.mockResolvedValue({
      attempted: 0,
      delivered: 0,
      failed: 0,
    });
    outbox.orderNotificationOutboxService.deliverForOrder.mockResolvedValue({
      attempted: 1,
      sent: 1,
      failed: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rate-limits by request identity and creates a server-priced pending order", async () => {
    orderService.createPendingOrder.mockResolvedValue({
      orderId: "507f191e810c19729de860ea",
      orderNumber: "FL-20260811-ORDER1234",
      total: 320_000,
      status: "pending",
    });

    const response = await POST(
      postJson(validCheckout, { "x-forwarded-for": "203.0.113.45, 10.0.0.1" })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      order: {
        orderId: "507f191e810c19729de860ea",
        orderNumber: "FL-20260811-ORDER1234",
        total: 320_000,
        status: "pending",
      },
    });
    expect(rateLimit.rateLimiter.consume).toHaveBeenNthCalledWith(1, {
      namespace: "checkout:attempt",
      subject: "203.0.113.45",
      limit: 30,
      windowMs: 15 * 60 * 1_000,
    });
    // The order quota follows the customer, not the address: a carrier NAT or an
    // office puts unrelated shoppers behind one address.
    expect(rateLimit.rateLimiter.consume).toHaveBeenNthCalledWith(2, {
      namespace: "checkout:order",
      subject: "phone:998901234567",
      limit: 5,
      windowMs: 15 * 60 * 1_000,
    });
    expect(orderService.createPendingOrder).toHaveBeenCalledWith(validCheckout);
    expect(outbox.orderNotificationOutboxService.deliverForOrder).toHaveBeenCalledWith(
      "507f191e810c19729de860ea"
    );
    expect(response.headers.get("x-ratelimit-remaining")).toBe("4");
  });

  it("still returns a created order when the optional notifier unexpectedly throws", async () => {
    orderService.createPendingOrder.mockResolvedValue({
      orderId: "507f191e810c19729de860ea",
      orderNumber: "FL-20260811-ORDER1234",
      total: 320_000,
      status: "pending",
    });
    outbox.orderNotificationOutboxService.deliverForOrder.mockRejectedValue(
      new Error("provider unavailable")
    );
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(postJson(validCheckout));

    expect(response.status).toBe(201);
    expect(orderService.createPendingOrder).toHaveBeenCalledTimes(1);
    expect(errorLog).toHaveBeenCalledWith("Order notification dispatch failed.");
  });

  it("returns the unavailable response for an out-of-season product", async () => {
    orderService.createPendingOrder.mockRejectedValue({
      code: "PRODUCT_OUT_OF_SEASON",
      status: 409,
    });

    const response = await POST(postJson(validCheckout));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      code: "PRODUCT_OUT_OF_SEASON",
      error: expect.any(String),
    });
  });

  // Without the id the shopper only learns that "a product" failed, which is
  // useless when the offending line is not the one shown in the summary.
  it("names the offending product so the client can identify and drop it", async () => {
    orderService.createPendingOrder.mockRejectedValue({
      code: "PRODUCT_UNAVAILABLE",
      status: 409,
      productId: "507f1f77bcf86cd799439011",
    });

    const response = await POST(postJson(validCheckout));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      code: "PRODUCT_UNAVAILABLE",
      error: expect.any(String),
      productId: "507f1f77bcf86cd799439011",
    });
  });

  it("omits productId when the failure does not carry one", async () => {
    orderService.createPendingOrder.mockRejectedValue({
      code: "ORDER_STATE_CONFLICT",
      status: 409,
    });

    const response = await POST(postJson(validCheckout));

    expect(await response.json()).not.toHaveProperty("productId");
  });

  it("rejects malformed bodies before the order service sees them", async () => {
    const response = await POST(
      postJson({ ...validCheckout, total: 1, items: [] })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.any(String) });
    expect(orderService.createPendingOrder).not.toHaveBeenCalled();
  });

  it("returns Retry-After when the persistent limiter blocks checkout", async () => {
    rateLimit.rateLimiter.consume.mockRejectedValue(
      new rateLimit.RateLimitExceededError(42)
    );

    const response = await POST(postJson(validCheckout));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    await expect(response.json()).resolves.toEqual({
      code: "RATE_LIMITED",
      error: "Слишком много попыток. Повторите позже.",
      retryAfterSeconds: 42,
    });
    expect(orderService.createPendingOrder).not.toHaveBeenCalled();
  });

  // A mistyped phone number is the most common rejection at checkout. Charging the
  // order quota for it spends a shopper's whole allowance on their own corrections.
  it("does not spend the order quota on a submission that fails validation", async () => {
    const response = await POST(postJson({ ...validCheckout, items: [] }));

    expect(response.status).toBe(400);
    expect(rateLimit.rateLimiter.consume).toHaveBeenCalledTimes(1);
    expect(rateLimit.rateLimiter.consume).toHaveBeenCalledWith(
      expect.objectContaining({ namespace: "checkout:attempt" })
    );
  });

  // Without this cap, an invalid body would cost nothing and could be replayed
  // without limit — validation-first quota accounting must not remove the ceiling.
  it("still charges the attempt quota for a submission that fails validation", async () => {
    rateLimit.rateLimiter.consume.mockRejectedValue(
      new rateLimit.RateLimitExceededError(120)
    );

    const response = await POST(postJson({ ...validCheckout, items: [] }));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("120");
  });

  it("returns stable codes and English copy for invalid English checkout data", async () => {
    const response = await POST(
      postJson({ ...validCheckout, locale: "en", items: [] })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: "VALIDATION_ERROR",
      error: "Check your order details.",
    });
  });
});
