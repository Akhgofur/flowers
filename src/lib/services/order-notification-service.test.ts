import { describe, expect, it, vi } from "vitest";
import {
  createOrderNotificationService,
  formatNewOrderNotification,
  type NewOrderNotification,
} from "./order-notification-service";

const order: NewOrderNotification = {
  orderNumber: "FL-20260811-AB12",
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
    expect(formatNewOrderNotification(order)).toContain("Yangi buyurtma: FL-20260811-AB12");
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

const orderWithItems: NewOrderNotification = {
  ...order,
  items: [
    {
      name: "Цветочная корзина №79",
      quantity: 5,
      lineTotal: 2_500_000,
      imageUrl: "https://res.cloudinary.com/demo/basket.png",
    },
    {
      name: "Букет алых роз",
      quantity: 1,
      lineTotal: 535_000,
      imageUrl: "https://res.cloudinary.com/demo/roses.png",
    },
  ],
};

describe("operator message contents", () => {
  it("lists what was ordered, not only the total", () => {
    const text = formatNewOrderNotification(orderWithItems);

    expect(text).toContain("Mahsulotlar:");
    expect(text).toContain("1. Цветочная корзина №79 × 5");
    expect(text).toContain("2. Букет алых роз × 1");
    // The line total must be there so the operator can check the sum.
    expect(text).toMatch(/Цветочная корзина №79 × 5 — 2[\s ]500[\s ]000/);
  });

  it("still formats an order whose items were not loaded", () => {
    expect(() => formatNewOrderNotification(order)).not.toThrow();
    expect(formatNewOrderNotification(order)).toContain("Yangi buyurtma");
  });

  it("labels a line the shop has not priced", () => {
    const text = formatNewOrderNotification({
      ...order,
      items: [
        {
          name: "Авторский букет №1",
          quantity: 1,
          imageUrl: "https://res.cloudinary.com/demo/bouquet.png",
        },
      ],
    });

    expect(text).toContain("Авторский букет №1 × 1 — narx so‘rov bo‘yicha");
  });
});

describe("telegram photo delivery", () => {
  function serviceWith(sendTelegram: ReturnType<typeof vi.fn>) {
    return createOrderNotificationService({
      getConfig: () => ({ telegram: { botToken: "token", chatId: "-100" } }),
      sendEmail: vi.fn(),
      sendTelegram,
      logFailure: vi.fn(),
    });
  }

  it("passes every product photo alongside the text", async () => {
    const sendTelegram = vi.fn().mockResolvedValue(undefined);

    await serviceWith(sendTelegram).notifyTelegramOrder(orderWithItems);

    const [, message] = sendTelegram.mock.calls[0] ?? [];
    expect(message.photos).toEqual([
      "https://res.cloudinary.com/demo/basket.png",
      "https://res.cloudinary.com/demo/roses.png",
    ]);
    expect(message.text).toContain("Yangi buyurtma");
  });

  it("sends no photos when the order carries none", async () => {
    const sendTelegram = vi.fn().mockResolvedValue(undefined);

    await serviceWith(sendTelegram).notifyTelegramOrder(order);

    const [, message] = sendTelegram.mock.calls[0] ?? [];
    expect(message.photos).toEqual([]);
  });

  it("skips a line whose image url is empty", async () => {
    const sendTelegram = vi.fn().mockResolvedValue(undefined);
    const mixed: NewOrderNotification = {
      ...orderWithItems,
      items: [
        { ...orderWithItems.items![0]!, imageUrl: "" },
        orderWithItems.items![1]!,
      ],
    };

    await serviceWith(sendTelegram).notifyTelegramOrder(mixed);

    const [, message] = sendTelegram.mock.calls[0] ?? [];
    expect(message.photos).toEqual(["https://res.cloudinary.com/demo/roses.png"]);
  });
});
