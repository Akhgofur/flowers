import { describe, expect, it, vi } from "vitest";
import {
  createOrderNotificationService,
  formatNewOrderNotification,
  type NewOrderNotification,
} from "./order-notification-service";

const order: NewOrderNotification = {
  orderNumber: "NF-20260811-AB12",
  total: 420_000,
  paymentMethod: "card_on_delivery",
  customer: {
    fullName: "Dilnoza Karimova",
    phone: "+998901234567",
    address: "Toshkent, Yunusobod 12",
    deliveryDate: "2026-08-12",
    comment: "Qo'ng'iroq qiling",
  },
};

describe("order notifications", () => {
  it("formats a plain-text operator message without payment-provider claims", () => {
    expect(formatNewOrderNotification(order)).toContain("Yangi buyurtma: NF-20260811-AB12");
    expect(formatNewOrderNotification(order)).toContain("To'lov: Yetkazilganda karta");
    expect(formatNewOrderNotification(order)).not.toContain("Payme");
  });

  it("does nothing when no optional notification channel is configured", async () => {
    const sendEmail = vi.fn();
    const sendTelegram = vi.fn();
    const service = createOrderNotificationService({
      getConfig: () => ({}),
      sendEmail,
      sendTelegram,
    });

    await expect(service.notifyNewOrder(order)).resolves.toEqual({
      attempted: 0,
      delivered: 0,
      failed: 0,
    });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendTelegram).not.toHaveBeenCalled();
  });

  it("keeps a completed order successful when one optional channel fails", async () => {
    const sendEmail = vi.fn().mockResolvedValue(undefined);
    const sendTelegram = vi.fn().mockRejectedValue(new Error("provider unavailable"));
    const logFailure = vi.fn();
    const service = createOrderNotificationService({
      getConfig: () => ({
        email: {
          host: "smtp.example.test",
          port: 587,
          user: "operator",
          password: "secret",
          from: "orders@example.test",
          to: "owner@example.test",
        },
        telegram: { botToken: "token", chatId: "chat" },
      }),
      sendEmail,
      sendTelegram,
      logFailure,
    });

    await expect(service.notifyNewOrder(order)).resolves.toEqual({
      attempted: 2,
      delivered: 1,
      failed: 1,
    });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendTelegram).toHaveBeenCalledTimes(1);
    expect(logFailure).toHaveBeenCalledWith("telegram");
  });
});
