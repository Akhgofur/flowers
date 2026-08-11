import { describe, expect, it } from "vitest";
import type {
  CheckoutInput,
  CurrentSeason,
  OrderStatus,
  PaymentMethod,
  ProductStatus,
  Season,
} from "@/lib/contracts";
import {
  OrderNotFoundError,
  ProductOutOfSeasonError,
  ProductUnavailableError,
  createOrderService,
  type OrderStore,
  type PendingOrderRecord,
  type ProductPurchaseState,
  type ReservedProduct,
  type StoredOrder,
} from "./order-service";
import { InvalidOrderTransitionError } from "./order-transitions";

const redRoseId = "507f1f77bcf86cd799439011";
const tulipId = "507f1f77bcf86cd799439012";

const checkoutInput: CheckoutInput = {
  locale: "ru",
  customer: {
    fullName: "Ali Valiyev",
    phone: "+998901234567",
    address: "Toshkent shahri, Chilonzor tumani",
    deliveryDate: "2026-08-12",
    comment: "Eshik oldida qo'ng'iroq qiling",
  },
  paymentMethod: "cash_on_delivery",
  items: [
    { productId: redRoseId, quantity: 2 },
    { productId: tulipId, quantity: 1 },
  ],
};

type MutableProduct = ReservedProduct & {
  status: ProductStatus;
  seasons: Season[];
  stockQuantity: number;
};

function product(
  id: string,
  name: string,
  price: number,
  stockQuantity: number
): MutableProduct {
  return {
    id,
    slug: name.toLowerCase().replaceAll(" ", "-"),
    name,
    price,
    status: "published",
    seasons: ["all_year"],
    stockQuantity,
    images: [{ url: "https://images.pexels.com/photos/1234567/flower.jpg", alt: name }],
  };
}

class InMemoryOrderStore implements OrderStore {
  readonly products = new Map<string, MutableProduct>([
    [redRoseId, product(redRoseId, "Qizil atirgullar", 150_000, 4)],
    [tulipId, product(tulipId, "Oq lolalar", 90_000, 2)],
  ]);
  readonly orders = new Map<string, StoredOrder>();
  readonly notifications: Array<{ orderId: string; channel: "telegram" }> = [];
  readonly reservationOrder: string[] = [];
  readonly reservationLocales: string[] = [];
  readonly reservationSeasons: CurrentSeason[] = [];
  deliveryFee = 20_000;
  duplicateNumberOnce = false;
  private nextOrderId = 1;

  async withTransaction<T>(operation: (transaction: object) => Promise<T>): Promise<T> {
    const productSnapshot = new Map(
      [...this.products].map(([id, value]) => [id, { ...value, images: [...value.images] }])
    );
    const orderSnapshot = new Map(this.orders);
    const notificationSnapshot = [...this.notifications];

    try {
      return await operation({});
    } catch (error) {
      this.products.clear();
      for (const [id, value] of productSnapshot) this.products.set(id, value);
      this.orders.clear();
      for (const [id, value] of orderSnapshot) this.orders.set(id, value);
      this.notifications.splice(0, this.notifications.length, ...notificationSnapshot);
      throw error;
    }
  }

  async reserveProduct(
    productId: string,
    quantity: number,
    locale: "ru" | "uz" | "en",
    currentSeason: CurrentSeason
  ): Promise<ReservedProduct | null> {
    this.reservationOrder.push(productId);
    this.reservationLocales.push(locale);
    this.reservationSeasons.push(currentSeason);
    const record = this.products.get(productId);
    if (
      !record ||
      record.stockQuantity < quantity ||
      !Number.isSafeInteger(record.price) ||
      record.price <= 0 ||
      (record.seasons[0] !== "all_year" && !record.seasons.includes(currentSeason))
    ) {
      return null;
    }

    record.stockQuantity -= quantity;
    return { ...record, images: [...record.images] };
  }

  async inspectProduct(productId: string): Promise<ProductPurchaseState | null> {
    const record = this.products.get(productId);
    if (!record) return null;

    return {
      status: record.status,
      seasons: [...record.seasons],
      stockQuantity: record.stockQuantity,
      price: record.price,
    };
  }

  async getDeliveryFee(): Promise<number> {
    return this.deliveryFee;
  }

  async createPendingOrder(
    record: PendingOrderRecord
  ): Promise<StoredOrder> {
    if (this.duplicateNumberOnce) {
      this.duplicateNumberOnce = false;
      throw Object.assign(new Error("Duplicate order number"), { code: 11_000 });
    }
    const id = `order-${this.nextOrderId++}`;
    const stored: StoredOrder = { ...record, id };
    this.orders.set(id, stored);
    return stored;
  }

  async createOrderNotification(orderId: string, channel: "telegram"): Promise<void> {
    this.notifications.push({ orderId, channel });
  }

  async findOrderById(orderId: string): Promise<StoredOrder | null> {
    return this.orders.get(orderId) ?? null;
  }

  async updateOrderStatus(
    orderId: string,
    expectedStatus: OrderStatus,
    nextStatus: OrderStatus
  ): Promise<StoredOrder | null> {
    const order = this.orders.get(orderId);
    if (!order || order.status !== expectedStatus) return null;
    const updated = { ...order, status: nextStatus } as StoredOrder;
    this.orders.set(orderId, updated);
    return updated;
  }

  async claimStockRelease(orderId: string, at: Date): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order || order.stockReleasedAt) return false;
    this.orders.set(orderId, { ...order, stockReleasedAt: at });
    return true;
  }

  async restoreProductStock(
    productId: string,
    quantity: number
  ): Promise<void> {
    const record = this.products.get(productId);
    if (!record) throw new Error("Missing product during stock restore");
    record.stockQuantity += quantity;
  }
}

function makeService(store: InMemoryOrderStore) {
  return createOrderService({
    store,
    now: () => new Date("2026-08-11T10:00:00.000Z"),
    generateOrderNumber: () => "NF-20260811-TESTNUMBER",
  });
}

describe("transactional order service", () => {
  it("takes prices from reserved products, snapshots them, and reserves stock sequentially", async () => {
    const store = new InMemoryOrderStore();
    const result = await makeService(store).createPendingOrder(checkoutInput);
    const order = store.orders.get(result.orderId);

    expect(result).toEqual({
      orderId: "order-1",
      orderNumber: "NF-20260811-TESTNUMBER",
      total: 410_000,
      status: "pending",
    });
    expect(store.reservationOrder).toEqual([redRoseId, tulipId]);
    expect(store.reservationLocales).toEqual(["ru", "ru"]);
    expect(store.reservationSeasons).toEqual(["summer", "summer"]);
    expect(store.products.get(redRoseId)?.stockQuantity).toBe(2);
    expect(store.products.get(tulipId)?.stockQuantity).toBe(1);
    expect(order).toMatchObject({
      paymentStatus: "unpaid",
      paymentMethod: "cash_on_delivery" as PaymentMethod,
      subtotal: 390_000,
      deliveryFee: 20_000,
      total: 410_000,
      items: [
        { productId: redRoseId, unitPrice: 150_000, quantity: 2, lineTotal: 300_000 },
        { productId: tulipId, unitPrice: 90_000, quantity: 1, lineTotal: 90_000 },
      ],
    });
    expect(order?.customer.deliveryDate?.toISOString()).toBe("2026-08-12T12:00:00.000Z");
    expect(store.notifications).toEqual([
      { orderId: result.orderId, channel: "telegram" },
    ]);
  });

  it("stores the server-selected product name in the checkout locale", async () => {
    const store = new InMemoryOrderStore();
    const originalReserve = store.reserveProduct.bind(store);
    store.reserveProduct = async (productId, quantity, locale, currentSeason) => {
      const reserved = await originalReserve(
        productId,
        quantity,
        locale,
        currentSeason
      );
      if (!reserved) return null;
      return {
        ...reserved,
        name: locale === "en" ? "Scarlet rose bouquet" : "Букет алых роз",
      };
    };

    const result = await makeService(store).createPendingOrder({
      ...checkoutInput,
      locale: "en",
      items: [{ productId: redRoseId, quantity: 1 }],
    });

    expect(store.orders.get(result.orderId)).toMatchObject({
      locale: "en",
      items: [{ name: "Scarlet rose bouquet" }],
    });
  });

  it("rolls all reservations back when a later item is unavailable", async () => {
    const store = new InMemoryOrderStore();
    store.products.get(tulipId)!.stockQuantity = 0;

    await expect(makeService(store).createPendingOrder(checkoutInput)).rejects.toBeInstanceOf(
      ProductUnavailableError
    );

    expect(store.products.get(redRoseId)?.stockQuantity).toBe(4);
    expect(store.orders).toHaveLength(0);
  });

  it("rejects an out-of-season product without decrementing its stock", async () => {
    const store = new InMemoryOrderStore();
    store.products.get(redRoseId)!.seasons = ["winter"];

    const error = await makeService(store)
      .createPendingOrder({
        ...checkoutInput,
        items: [{ productId: redRoseId, quantity: 1 }],
      })
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ProductOutOfSeasonError);
    expect(error).toMatchObject({
      code: "PRODUCT_OUT_OF_SEASON",
      productId: redRoseId,
    });
    expect(store.products.get(redRoseId)?.stockQuantity).toBe(4);
    expect(store.orders).toHaveLength(0);
  });

  it("rejects a product with a non-positive price before decrementing stock", async () => {
    const store = new InMemoryOrderStore();
    store.products.get(redRoseId)!.price = 0;

    await expect(
      makeService(store).createPendingOrder({
        ...checkoutInput,
        items: [{ productId: redRoseId, quantity: 1 }],
      })
    ).rejects.toBeInstanceOf(ProductUnavailableError);

    expect(store.products.get(redRoseId)?.stockQuantity).toBe(4);
    expect(store.orders).toHaveLength(0);
  });

  it("retries the whole transaction when the unique order number index reports a collision", async () => {
    const store = new InMemoryOrderStore();
    store.duplicateNumberOnce = true;
    let generated = 0;
    const service = createOrderService({
      store,
      now: () => new Date("2026-08-11T10:00:00.000Z"),
      generateOrderNumber: () => `NF-20260811-RETRY${++generated}`,
    });

    await expect(service.createPendingOrder(checkoutInput)).resolves.toMatchObject({
      orderNumber: "NF-20260811-RETRY2",
    });
    expect(store.orders).toHaveLength(1);
    expect(store.products.get(redRoseId)?.stockQuantity).toBe(2);
  });

  it("transitions forward and restores stock exactly once on cancellation", async () => {
    const store = new InMemoryOrderStore();
    const service = makeService(store);
    const created = await service.createPendingOrder(checkoutInput);

    await expect(service.transitionOrderStatus(created.orderId, "confirmed")).resolves.toMatchObject({
      status: "confirmed",
    });
    await expect(service.transitionOrderStatus(created.orderId, "cancelled")).resolves.toMatchObject({
      status: "cancelled",
      stockReleasedAt: expect.any(Date),
    });
    expect(store.products.get(redRoseId)?.stockQuantity).toBe(4);
    expect(store.products.get(tulipId)?.stockQuantity).toBe(2);
    await expect(service.transitionOrderStatus(created.orderId, "cancelled")).rejects.toBeInstanceOf(
      InvalidOrderTransitionError
    );
    expect(store.products.get(redRoseId)?.stockQuantity).toBe(4);
  });

  it("does not allow a transition for an unknown order", async () => {
    await expect(
      makeService(new InMemoryOrderStore()).transitionOrderStatus("missing", "confirmed")
    ).rejects.toBeInstanceOf(OrderNotFoundError);
  });
});
