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
  RESERVED_PRODUCT_PROJECTION,
  createOrderService,
  serializeOrder,
  type OrderStore,
  type PendingOrderRecord,
  type ProductPurchaseState,
  type ReservedProduct,
  type StoredOrder,
} from "./order-service";
import { resolveProductTranslation } from "@/lib/locale-content";

const redRoseId = "507f1f77bcf86cd799439011";
const tulipId = "507f1f77bcf86cd799439012";

function checkoutInput(overrides: Partial<CheckoutInput> = {}): CheckoutInput {
  return {
    locale: "ru",
    fulfilment: "delivery",
    customer: {
      fullName: "Ali Valiyev",
      phone: "+998901234567",
      address: "Toshkent shahri, Chilonzor tumani",
      deliveryDate: "2026-08-12",
      comment: "Eshik oldida qo'ng'iroq qiling",
    },
    paymentMethod: "card_on_delivery",
    items: [
      { productId: redRoseId, quantity: 2 },
      { productId: tulipId, quantity: 1 },
    ],
    ...overrides,
  };
}

type MutableProduct = ReservedProduct & {
  status: ProductStatus;
  seasons: Season[];
};

function product(id: string, name: string, price: number): MutableProduct {
  return {
    id,
    slug: name.toLowerCase().replaceAll(" ", "-"),
    name,
    price,
    status: "published",
    seasons: ["all_year"],
    images: [{ url: "https://images.pexels.com/photos/1234567/flower.jpg", alt: name }],
  };
}

class InMemoryOrderStore implements OrderStore {
  readonly products = new Map<string, MutableProduct>([
    [redRoseId, product(redRoseId, "Qizil atirgullar", 150_000)],
    [tulipId, product(tulipId, "Oq lolalar", 90_000)],
  ]);
  readonly orders = new Map<string, StoredOrder>();
  readonly notifications: Array<{ orderId: string; channel: "telegram" }> = [];
  readonly reservationOrder: string[] = [];
  readonly reservationLocales: string[] = [];
  readonly reservationSeasons: CurrentSeason[] = [];
  deliveryFee = 20_000;
  duplicateNumberOnce = false;
  lastCreatedOrder: StoredOrder | undefined;
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
      record.status !== "published" ||
      (record.seasons[0] !== "all_year" && !record.seasons.includes(currentSeason))
    ) {
      return null;
    }

    return { ...record, images: [...record.images] };
  }

  async inspectProduct(productId: string): Promise<ProductPurchaseState | null> {
    const record = this.products.get(productId);
    if (!record) return null;

    return {
      status: record.status,
      seasons: [...record.seasons],
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
    this.lastCreatedOrder = stored;
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

}

function makeService(store: InMemoryOrderStore) {
  return createOrderService({
    store,
    now: () => new Date("2026-08-11T10:00:00.000Z"),
    generateOrderNumber: () => "FL-20260811-TESTNUMBER",
  });
}

function buildService(options: { deliveryFee?: number } = {}) {
  const store = new InMemoryOrderStore();
  if (options.deliveryFee !== undefined) {
    store.deliveryFee = options.deliveryFee;
  }
  return { service: makeService(store), store };
}

describe("transactional order service", () => {
  it("takes prices from reserved products, snapshots them, and reserves products sequentially", async () => {
    const store = new InMemoryOrderStore();
    const result = await makeService(store).createPendingOrder(checkoutInput());
    const order = store.orders.get(result.orderId);

    expect(result).toEqual({
      orderId: "order-1",
      orderNumber: "FL-20260811-TESTNUMBER",
      total: 410_000,
      status: "pending",
    });
    expect(store.reservationOrder).toEqual([redRoseId, tulipId]);
    expect(store.reservationLocales).toEqual(["ru", "ru"]);
    expect(store.reservationSeasons).toEqual(["summer", "summer"]);
    expect(order).toMatchObject({
      paymentStatus: "unpaid",
      // Carried straight through from the checkout input, which is card because
      // a delivered order cannot be paid in cash.
      paymentMethod: "card_on_delivery" as PaymentMethod,
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

    const result = await makeService(store).createPendingOrder(
      checkoutInput({
        locale: "en",
        items: [{ productId: redRoseId, quantity: 1 }],
      })
    );

    expect(store.orders.get(result.orderId)).toMatchObject({
      locale: "en",
      items: [{ name: "Scarlet rose bouquet" }],
    });
  });

  it("rolls all reservations back when a later item is unavailable", async () => {
    const store = new InMemoryOrderStore();
    store.products.get(tulipId)!.status = "archived";

    await expect(makeService(store).createPendingOrder(checkoutInput())).rejects.toBeInstanceOf(
      ProductUnavailableError
    );

    expect(store.reservationOrder).toEqual([redRoseId, tulipId]);
    expect(store.orders).toHaveLength(0);
  });

  it("rejects an out-of-season product before creating an order", async () => {
    const store = new InMemoryOrderStore();
    store.products.get(redRoseId)!.seasons = ["winter"];

    const error = await makeService(store)
      .createPendingOrder(
        checkoutInput({ items: [{ productId: redRoseId, quantity: 1 }] })
      )
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ProductOutOfSeasonError);
    expect(error).toMatchObject({
      code: "PRODUCT_OUT_OF_SEASON",
      productId: redRoseId,
    });
    expect(store.orders).toHaveLength(0);
  });

  it("accepts a line with no price and counts only priced lines in the total", async () => {
    const store = new InMemoryOrderStore();
    const priceless = product(tulipId, "Narxsiz buket", 0);
    priceless.price = undefined as unknown as number;
    store.products.set(tulipId, priceless);

    const result = await makeService(store).createPendingOrder(checkoutInput());
    const order = store.orders.get(result.orderId);

    expect(order?.items).toEqual([
      expect.objectContaining({ productId: redRoseId, unitPrice: 150_000, lineTotal: 300_000 }),
      expect.objectContaining({ productId: tulipId, quantity: 1 }),
    ]);
    expect(order?.items[1]).not.toHaveProperty("unitPrice");
    expect(order?.items[1]).not.toHaveProperty("lineTotal");
    expect(order?.subtotal).toBe(300_000);
    expect(order?.total).toBe(320_000);
  });

  it("retries the whole transaction when the unique order number index reports a collision", async () => {
    const store = new InMemoryOrderStore();
    store.duplicateNumberOnce = true;
    let generated = 0;
    const service = createOrderService({
      store,
      now: () => new Date("2026-08-11T10:00:00.000Z"),
      generateOrderNumber: () => `FL-20260811-RETRY${++generated}`,
    });

    await expect(service.createPendingOrder(checkoutInput())).resolves.toMatchObject({
      orderNumber: "FL-20260811-RETRY2",
    });
    expect(store.orders).toHaveLength(1);
  });

  it("cancels an order without touching any product record", async () => {
    const store = new InMemoryOrderStore();
    const service = makeService(store);
    const created = await service.createPendingOrder(checkoutInput());
    const before = new Map(
      [...store.products].map(([id, value]) => [id, { ...value }])
    );

    await service.transitionOrderStatus(created.orderId, "confirmed");
    await expect(
      service.transitionOrderStatus(created.orderId, "cancelled")
    ).resolves.toMatchObject({ status: "cancelled" });

    expect([...store.products]).toEqual([...before]);
  });

  it("does not allow a transition for an unknown order", async () => {
    await expect(
      makeService(new InMemoryOrderStore()).transitionOrderStatus("missing", "confirmed")
    ).rejects.toBeInstanceOf(OrderNotFoundError);
  });

  it("charges no delivery fee on a collected order", async () => {
    const { service, store } = buildService({ deliveryFee: 25000 });

    await service.createPendingOrder(
      checkoutInput({
        fulfilment: "pickup",
        customer: { fullName: "Aziza Karimova", phone: "+998901234567" },
      })
    );

    expect(store.lastCreatedOrder?.deliveryFee).toBe(0);
    expect(store.lastCreatedOrder?.fulfilment).toBe("pickup");
    expect(store.lastCreatedOrder?.customer.address).toBeUndefined();
  });

  it("still charges the settings fee on a delivery", async () => {
    const { service, store } = buildService({ deliveryFee: 25000 });

    await service.createPendingOrder(checkoutInput({ fulfilment: "delivery" }));

    expect(store.lastCreatedOrder?.deliveryFee).toBe(25000);
    expect(store.lastCreatedOrder?.fulfilment).toBe("delivery");
  });
});

/**
 * `serializeOrder` reads a `.lean()` Mongo document, which skips schema
 * defaults entirely. An order written before `fulfilment` existed on the
 * schema therefore comes back with the field completely absent, not
 * defaulted to "delivery" the way a hydrated Mongoose document would be.
 * This pins that read path to `resolveFulfilment`'s fallback so a legacy
 * order is never silently mistreated as some other method.
 */
describe("serializeOrder", () => {
  it("defaults a legacy order with no stored fulfilment to delivery", () => {
    const legacyDocument = {
      _id: { toString: () => "order-legacy" },
      number: "FL-20250101-LEGACY",
      locale: "ru",
      customer: {
        fullName: "Eski Mijoz",
        phone: "+998901234567",
        address: "Toshkent shahri, Chilonzor tumani",
      },
      items: [],
      subtotal: 0,
      deliveryFee: 20_000,
      total: 20_000,
      paymentMethod: "cash_on_delivery",
      status: "pending",
      // fulfilment intentionally absent: this order predates the field.
    } as never;

    expect(serializeOrder(legacyDocument).fulfilment).toBe("delivery");
  });
});

/**
 * The store tests above inject an in-memory store, so the real MongoDB reservation
 * projection is never exercised there. It once selected only `translations.<locale>.name`
 * while resolveProductTranslation also requires shortDescription, description and a
 * non-empty composition — so every reservation resolved to null and no order could
 * ever be created. These tests pin the projection to what the resolver consumes.
 */
describe("reservation projection", () => {
  /** Mirrors how MongoDB applies an inclusion projection, dotted paths included. */
  function project(
    document: Record<string, unknown>,
    projection: Record<string, unknown>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const path of Object.keys(projection)) {
      const segments = path.split(".");
      let source: unknown = document;
      for (const segment of segments) {
        source =
          typeof source === "object" && source !== null
            ? (source as Record<string, unknown>)[segment]
            : undefined;
      }
      if (source === undefined) continue;

      let target = result;
      for (const segment of segments.slice(0, -1)) {
        target[segment] ??= {};
        target = target[segment] as Record<string, unknown>;
      }
      target[segments[segments.length - 1]!] = source;
    }

    return result;
  }

  const storedProduct = {
    _id: redRoseId,
    slug: "qirmizi-atirgul",
    name: "Qirmizi atirgul",
    price: 500_000,
    status: "published",
    seasons: ["summer"],
    images: [{ url: "https://cdn.example.com/rose.png", alt: "Qirmizi atirgul" }],
    translations: {
      ru: {
        name: "Красные розы",
        shortDescription: "Свежие красные розы.",
        description: "Букет из свежих красных роз.",
        composition: ["Розы", "Зелень"],
      },
      uz: {
        name: "Qirmizi atirgul",
        shortDescription: "Yangi qirmizi atirgullar.",
        description: "Yangi qirmizi atirgullardan buket.",
        composition: ["Atirgul", "Yashillik"],
      },
    },
  };

  it.each(["ru", "uz", "en"] as const)(
    "keeps a %s reservation resolvable after projection",
    (locale) => {
      const projected = project(storedProduct, RESERVED_PRODUCT_PROJECTION);

      expect(resolveProductTranslation(projected as never, locale)).not.toBeNull();
    }
  );

  it("still carries the fields the reserved product is built from", () => {
    const projected = project(storedProduct, RESERVED_PRODUCT_PROJECTION);

    expect(projected).toMatchObject({
      slug: "qirmizi-atirgul",
      price: 500_000,
    });
    expect(projected.images).toHaveLength(1);
  });
});
