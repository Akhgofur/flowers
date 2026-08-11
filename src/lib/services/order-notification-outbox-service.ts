import "server-only";
import type { NewOrderNotification } from "@/lib/services/order-notification-service";
import { orderNotificationService } from "@/lib/services/order-notification-service";
import {
  claimNextDueNotification,
  claimNotificationForOrder,
  loadOrderNotification,
  markNotificationFailed,
  markNotificationSent,
  resetStaleNotificationClaims,
  scheduleNotificationRetry,
} from "@/lib/repositories/order-notification-repository";

export type ClaimedOrderNotification = {
  id: string;
  orderId: string;
  channel: "telegram";
  status: "processing";
  attempts: number;
};

export type NotificationDeliverySummary = {
  attempted: number;
  sent: number;
  failed: number;
};

export type OrderNotificationOutboxStore = {
  claimForOrder(orderId: string, now: Date): Promise<ClaimedOrderNotification | null>;
  claimNextDue(now: Date): Promise<ClaimedOrderNotification | null>;
  resetStaleClaims(staleBefore: Date, now: Date): Promise<number>;
  loadOrderNotification(orderId: string): Promise<NewOrderNotification | null>;
  markSent(id: string, sentAt: Date): Promise<void>;
  markFailed(id: string, errorCode: string, nextAttemptAt?: Date): Promise<void>;
  scheduleRetry(orderId: string, now: Date): Promise<void>;
};

type OutboxDependencies = {
  store: OrderNotificationOutboxStore;
  sendTelegram: (order: NewOrderNotification) => Promise<void>;
  now?: () => Date;
};

const RETRY_DELAYS_MINUTES = [1, 5, 15, 60, 240] as const;
const SAFE_ERROR_CODES = new Set([
  "CONFIG_MISSING",
  "TIMEOUT",
  "HTTP_REJECTED",
  "ORDER_NOT_FOUND",
]);

export class OrderNotificationDeliveryError extends Error {
  constructor(readonly code: string) {
    super("Order notification delivery failed.");
    this.name = "OrderNotificationDeliveryError";
  }
}

function safeErrorCode(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string" &&
    SAFE_ERROR_CODES.has((error as { code: string }).code)
  ) {
    return (error as { code: string }).code;
  }
  return "HTTP_REJECTED";
}

function nextAttempt(attempts: number, now: Date): Date | undefined {
  if (attempts >= 10) return undefined;
  const delay = RETRY_DELAYS_MINUTES[Math.min(attempts - 1, RETRY_DELAYS_MINUTES.length - 1)]!;
  return new Date(now.getTime() + delay * 60_000);
}

export function createOrderNotificationOutboxService({
  store,
  sendTelegram,
  now = () => new Date(),
}: OutboxDependencies) {
  async function deliverClaimed(
    notification: ClaimedOrderNotification
  ): Promise<NotificationDeliverySummary> {
    const attemptedAt = now();
    try {
      const order = await store.loadOrderNotification(notification.orderId);
      if (!order) throw new OrderNotificationDeliveryError("ORDER_NOT_FOUND");
      await sendTelegram(order);
      await store.markSent(notification.id, attemptedAt);
      return { attempted: 1, sent: 1, failed: 0 };
    } catch (error) {
      await store.markFailed(
        notification.id,
        safeErrorCode(error),
        nextAttempt(notification.attempts, attemptedAt)
      );
      return { attempted: 1, sent: 0, failed: 1 };
    }
  }

  return {
    async deliverForOrder(orderId: string): Promise<NotificationDeliverySummary> {
      const claimed = await store.claimForOrder(orderId, now());
      return claimed
        ? deliverClaimed(claimed)
        : { attempted: 0, sent: 0, failed: 0 };
    },

    async retryDue(limit: number): Promise<NotificationDeliverySummary> {
      const batchSize = Math.max(0, Math.min(20, Math.trunc(limit)));
      const startedAt = now();
      await store.resetStaleClaims(
        new Date(startedAt.getTime() - 10 * 60_000),
        startedAt
      );
      const summary: NotificationDeliverySummary = { attempted: 0, sent: 0, failed: 0 };
      for (let index = 0; index < batchSize; index += 1) {
        const claimed = await store.claimNextDue(startedAt);
        if (!claimed) break;
        const result = await deliverClaimed(claimed);
        summary.attempted += result.attempted;
        summary.sent += result.sent;
        summary.failed += result.failed;
      }
      return summary;
    },

    async retryForOrder(orderId: string): Promise<NotificationDeliverySummary> {
      await store.scheduleRetry(orderId, now());
      const claimed = await store.claimForOrder(orderId, now());
      return claimed
        ? deliverClaimed(claimed)
        : { attempted: 0, sent: 0, failed: 0 };
    },
  };
}

export const orderNotificationOutboxService = createOrderNotificationOutboxService({
  store: {
    claimForOrder: claimNotificationForOrder,
    claimNextDue: claimNextDueNotification,
    resetStaleClaims: resetStaleNotificationClaims,
    loadOrderNotification,
    markSent: markNotificationSent,
    markFailed: markNotificationFailed,
    scheduleRetry: scheduleNotificationRetry,
  },
  sendTelegram: (order) => orderNotificationService.notifyTelegramOrder(order),
});
