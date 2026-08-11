import { describe, expect, it, vi } from "vitest";
import type {
  ClaimedOrderNotification,
  OrderNotificationOutboxStore,
} from "./order-notification-outbox-service";
import {
  createOrderNotificationOutboxService,
  OrderNotificationDeliveryError,
} from "./order-notification-outbox-service";

const notification: ClaimedOrderNotification = {
  id: "507f1f77bcf86cd799439031",
  orderId: "507f1f77bcf86cd799439021",
  channel: "telegram",
  status: "processing",
  attempts: 1,
};

const order = {
  orderNumber: "FL-20260811-ORDER1",
  total: 320_000,
  paymentMethod: "cash_on_delivery" as const,
  customer: {
    fullName: "Ali Valiyev",
    phone: "+998901234567",
    address: "Toshkent shahri, Chilonzor tumani",
  },
};

function createStore(): OrderNotificationOutboxStore {
  return {
    claimForOrder: vi.fn().mockResolvedValue(notification),
    claimNextDue: vi.fn().mockResolvedValue(null),
    resetStaleClaims: vi.fn().mockResolvedValue(0),
    loadOrderNotification: vi.fn().mockResolvedValue(order),
    markSent: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
    scheduleRetry: vi.fn().mockResolvedValue(undefined),
  };
}

describe("order notification outbox", () => {
  it("claims an order once and marks it sent after Telegram succeeds", async () => {
    const store = createStore();
    vi.mocked(store.claimForOrder)
      .mockResolvedValueOnce(notification)
      .mockResolvedValueOnce(null);
    const sendTelegram = vi.fn().mockResolvedValue(undefined);
    const service = createOrderNotificationOutboxService({ store, sendTelegram });

    await Promise.all([
      service.deliverForOrder(notification.orderId),
      service.deliverForOrder(notification.orderId),
    ]);

    expect(sendTelegram).toHaveBeenCalledTimes(1);
    expect(store.markSent).toHaveBeenCalledWith(notification.id, expect.any(Date));
  });

  it("stores a sanitized failure code and schedules exponential retry", async () => {
    const store = createStore();
    const service = createOrderNotificationOutboxService({
      store,
      sendTelegram: vi
        .fn()
        .mockRejectedValue(new OrderNotificationDeliveryError("TIMEOUT")),
      now: () => new Date("2026-08-11T10:00:00.000Z"),
    });

    await expect(service.deliverForOrder(notification.orderId)).resolves.toEqual({
      attempted: 1,
      sent: 0,
      failed: 1,
    });
    expect(store.markFailed).toHaveBeenCalledWith(
      notification.id,
      "TIMEOUT",
      new Date("2026-08-11T10:01:00.000Z")
    );
  });

  it("resets stale claims and processes no more than the requested batch", async () => {
    const store = createStore();
    vi.mocked(store.claimNextDue)
      .mockResolvedValueOnce(notification)
      .mockResolvedValueOnce({ ...notification, id: "second" })
      .mockResolvedValueOnce(null);
    const service = createOrderNotificationOutboxService({
      store,
      sendTelegram: vi.fn().mockResolvedValue(undefined),
      now: () => new Date("2026-08-11T10:00:00.000Z"),
    });

    await expect(service.retryDue(2)).resolves.toEqual({
      attempted: 2,
      sent: 2,
      failed: 0,
    });
    expect(store.resetStaleClaims).toHaveBeenCalledWith(
      new Date("2026-08-11T09:50:00.000Z"),
      new Date("2026-08-11T10:00:00.000Z")
    );
  });
});
