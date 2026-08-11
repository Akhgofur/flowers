import "server-only";
import mongoose, { type ClientSession, type Types } from "mongoose";
import type {
  CheckoutInput,
  OrderCreationResult,
  OrderStatus,
  PaymentMethod,
  ProductImage,
} from "@/lib/contracts";
import { dbConnect } from "@/lib/mongodb";
import { checkoutSchema } from "@/lib/validations";
import { OrderModel, type OrderDocument } from "@/models/Order";
import { ProductModel, type ProductDocument } from "@/models/Product";
import { SiteSettingsModel } from "@/models/SiteSettings";
import { createOrderNumber } from "./order-number";
import { assertAllowedOrderTransition } from "./order-transitions";
import type { Locale } from "@/i18n/config";
import { resolveProductTranslation } from "@/lib/locale-content";

export type OrderTransaction = object;

export type ReservedProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  stockQuantity: number;
  images: ProductImage[];
};

export type StoredOrderItem = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type StoredOrderCustomer = {
  fullName: string;
  phone: string;
  address: string;
  deliveryDate?: Date;
  comment?: string;
};

export type PendingOrderRecord = {
  number: string;
  locale: Locale;
  customer: StoredOrderCustomer;
  items: StoredOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: "unpaid";
  status: "pending";
};

export type StoredOrder = Omit<PendingOrderRecord, "status"> & {
  id: string;
  status: OrderStatus;
  stockReleasedAt?: Date;
};

export type OrderStore = {
  withTransaction<T>(operation: (transaction: OrderTransaction) => Promise<T>): Promise<T>;
  reserveProduct(
    productId: string,
    quantity: number,
    locale: Locale,
    transaction: OrderTransaction
  ): Promise<ReservedProduct | null>;
  getDeliveryFee(transaction: OrderTransaction): Promise<number>;
  createPendingOrder(
    record: PendingOrderRecord,
    transaction: OrderTransaction
  ): Promise<StoredOrder>;
  findOrderById(
    orderId: string,
    transaction: OrderTransaction
  ): Promise<StoredOrder | null>;
  updateOrderStatus(
    orderId: string,
    expectedStatus: OrderStatus,
    nextStatus: OrderStatus,
    transaction: OrderTransaction
  ): Promise<StoredOrder | null>;
  claimStockRelease(
    orderId: string,
    at: Date,
    transaction: OrderTransaction
  ): Promise<boolean>;
  restoreProductStock(
    productId: string,
    quantity: number,
    transaction: OrderTransaction
  ): Promise<void>;
};

type OrderServiceDependencies = {
  store: OrderStore;
  now?: () => Date;
  generateOrderNumber?: (date: Date) => string;
};

type ProductRecord = Pick<
  ProductDocument,
  "slug" | "translations" | "price" | "stockQuantity" | "images"
> & {
  _id: Types.ObjectId;
};

type OrderRecord = OrderDocument & { _id: Types.ObjectId };

export class OrderServiceError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number
  ) {
    super(message);
    this.name = "OrderServiceError";
  }
}

export class ProductUnavailableError extends OrderServiceError {
  constructor(readonly productId: string) {
    super("Bu mahsulot hozir yetarli miqdorda mavjud emas.", "PRODUCT_UNAVAILABLE", 409);
    this.name = "ProductUnavailableError";
  }
}

export class OrderNotFoundError extends OrderServiceError {
  constructor(readonly orderId: string) {
    super("Buyurtma topilmadi.", "ORDER_NOT_FOUND", 404);
    this.name = "OrderNotFoundError";
  }
}

export class OrderStateConflictError extends OrderServiceError {
  constructor() {
    super(
      "Buyurtma holati boshqa jarayonda yangilandi. Qayta urinib ko'ring.",
      "ORDER_STATE_CONFLICT",
      409
    );
    this.name = "OrderStateConflictError";
  }
}

function serializeOrder(document: OrderRecord): StoredOrder {
  return {
    id: document._id.toString(),
    number: document.number,
    locale: document.locale ?? "ru",
    customer: {
      fullName: document.customer.fullName,
      phone: document.customer.phone,
      address: document.customer.address,
      ...(document.customer.deliveryDate === undefined
        ? {}
        : { deliveryDate: document.customer.deliveryDate }),
      ...(document.customer.comment === undefined ? {} : { comment: document.customer.comment }),
    },
    items: document.items.map((item) => ({
      productId: item.productId.toString(),
      slug: item.slug,
      name: item.name,
      imageUrl: item.imageUrl,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    subtotal: document.subtotal,
    deliveryFee: document.deliveryFee,
    total: document.total,
    paymentMethod: document.paymentMethod,
    paymentStatus: "unpaid",
    status: document.status,
    ...(document.stockReleasedAt === undefined
      ? {}
      : { stockReleasedAt: document.stockReleasedAt }),
  };
}

function asClientSession(transaction: OrderTransaction): ClientSession {
  return transaction as ClientSession;
}

function createMongoOrderStore(): OrderStore {
  return {
    async withTransaction<T>(operation: (transaction: OrderTransaction) => Promise<T>): Promise<T> {
      const connection = await dbConnect();
      return connection.connection.transaction(async (session) => operation(session));
    },

    async reserveProduct(productId, quantity, locale, transaction) {
      const document = (await ProductModel.findOneAndUpdate(
        {
          _id: productId,
          status: "published",
          stockQuantity: { $gte: quantity },
        },
        { $inc: { stockQuantity: -quantity } },
        { new: true, session: asClientSession(transaction) }
      )
        .select({
          slug: 1,
          [`translations.${locale}.name`]: 1,
          "translations.ru.name": 1,
          name: 1,
          price: 1,
          stockQuantity: 1,
          images: 1,
        })
        .lean()
        .exec()) as unknown as ProductRecord | null;

      if (!document) return null;

      const translation = resolveProductTranslation(document, locale);
      if (!translation) return null;

      return {
        id: document._id.toString(),
        slug: document.slug,
        name: translation.name,
        price: document.price,
        stockQuantity: document.stockQuantity,
        images: document.images.map((image) => ({ ...image })),
      };
    },

    async getDeliveryFee(transaction) {
      const settings = await SiteSettingsModel.findOne({ key: "default" })
        .select({ deliveryFee: 1 })
        .session(asClientSession(transaction))
        .lean()
        .exec();

      return settings?.deliveryFee ?? 0;
    },

    async createPendingOrder(record, transaction) {
      const created = await OrderModel.create([record], {
        session: asClientSession(transaction),
      });
      const document = created[0] as unknown as OrderRecord | undefined;
      if (!document) throw new Error("Order write did not return a document.");

      return serializeOrder(document);
    },

    async findOrderById(orderId, transaction) {
      if (!mongoose.isValidObjectId(orderId)) return null;

      const document = (await OrderModel.findById(orderId)
        .session(asClientSession(transaction))
        .lean()
        .exec()) as unknown as OrderRecord | null;

      return document ? serializeOrder(document) : null;
    },

    async updateOrderStatus(orderId, expectedStatus, nextStatus, transaction) {
      const document = (await OrderModel.findOneAndUpdate(
        { _id: orderId, status: expectedStatus },
        { $set: { status: nextStatus } },
        { new: true, session: asClientSession(transaction) }
      )
        .lean()
        .exec()) as unknown as OrderRecord | null;

      return document ? serializeOrder(document) : null;
    },

    async claimStockRelease(orderId, at, transaction) {
      const result = await OrderModel.updateOne(
        { _id: orderId, stockReleasedAt: { $exists: false } },
        { $set: { stockReleasedAt: at } },
        { session: asClientSession(transaction) }
      ).exec();

      return result.modifiedCount === 1;
    },

    async restoreProductStock(productId, quantity, transaction) {
      await ProductModel.updateOne(
        { _id: productId },
        { $inc: { stockQuantity: quantity } },
        { session: asClientSession(transaction) }
      ).exec();
    },
  };
}

function parseDeliveryDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;

  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new OrderServiceError("Yetkazib berish sanasi noto'g'ri.", "INVALID_DELIVERY_DATE", 400);
  }

  return date;
}

function ensureMoney(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new OrderServiceError(`${label} is invalid.`, "INVALID_ORDER_AMOUNT", 500);
  }

  return value;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11_000
  );
}

function normalizeCheckoutInput(input: CheckoutInput): CheckoutInput {
  const parsed = checkoutSchema.parse(input);
  const productIds = new Set<string>();

  for (const item of parsed.items) {
    if (productIds.has(item.productId)) {
      throw new OrderServiceError(
        "Bir mahsulot buyurtmaga faqat bir marta kiritilishi mumkin.",
        "DUPLICATE_ORDER_ITEM",
        400
      );
    }
    productIds.add(item.productId);
  }

  return parsed;
}

const MAX_ORDER_NUMBER_ATTEMPTS = 3;

export function createOrderService(dependencies: OrderServiceDependencies) {
  const now = dependencies.now ?? (() => new Date());
  const generateOrderNumber = dependencies.generateOrderNumber ?? createOrderNumber;

  return {
    async createPendingOrder(input: CheckoutInput): Promise<OrderCreationResult> {
      const checkout = normalizeCheckoutInput(input);
      let lastDuplicateError: unknown;

      for (let attempt = 0; attempt < MAX_ORDER_NUMBER_ATTEMPTS; attempt += 1) {
        try {
          return await dependencies.store.withTransaction(async (transaction) => {
            const deliveryFee = ensureMoney(
              await dependencies.store.getDeliveryFee(transaction),
              "Delivery fee"
            );
            const items: StoredOrderItem[] = [];
            let subtotal = 0;

            // MongoDB transactions must not issue parallel operations on the same session.
            for (const item of checkout.items) {
              const product = await dependencies.store.reserveProduct(
                item.productId,
                item.quantity,
                checkout.locale,
                transaction
              );

              if (!product) throw new ProductUnavailableError(item.productId);

              const image = product.images[0];
              if (!image) {
                throw new ProductUnavailableError(item.productId);
              }

              const lineTotal = ensureMoney(product.price * item.quantity, "Line total");
              subtotal = ensureMoney(subtotal + lineTotal, "Subtotal");
              items.push({
                productId: product.id,
                slug: product.slug,
                name: product.name,
                imageUrl: image.url,
                unitPrice: product.price,
                quantity: item.quantity,
                lineTotal,
              });
            }

            const total = ensureMoney(subtotal + deliveryFee, "Order total");
            const created = await dependencies.store.createPendingOrder(
              {
                number: generateOrderNumber(now()),
                locale: checkout.locale,
                customer: {
                  fullName: checkout.customer.fullName,
                  phone: checkout.customer.phone,
                  address: checkout.customer.address,
                  ...(checkout.customer.deliveryDate === undefined
                    ? {}
                    : { deliveryDate: parseDeliveryDate(checkout.customer.deliveryDate) }),
                  ...(checkout.customer.comment === undefined
                    ? {}
                    : { comment: checkout.customer.comment }),
                },
                items,
                subtotal,
                deliveryFee,
                total,
                paymentMethod: checkout.paymentMethod,
                paymentStatus: "unpaid",
                status: "pending",
              },
              transaction
            );

            return {
              orderId: created.id,
              orderNumber: created.number,
              total: created.total,
              status: "pending" as const,
            };
          });
        } catch (error) {
          if (isDuplicateKeyError(error) && attempt < MAX_ORDER_NUMBER_ATTEMPTS - 1) {
            lastDuplicateError = error;
            continue;
          }
          throw error;
        }
      }

      throw lastDuplicateError ?? new Error("Unable to create an order number.");
    },

    async transitionOrderStatus(orderId: string, nextStatus: OrderStatus): Promise<StoredOrder> {
      return dependencies.store.withTransaction(async (transaction) => {
        const order = await dependencies.store.findOrderById(orderId, transaction);
        if (!order) throw new OrderNotFoundError(orderId);

        assertAllowedOrderTransition(order.status, nextStatus);
        const updated = await dependencies.store.updateOrderStatus(
          orderId,
          order.status,
          nextStatus,
          transaction
        );
        if (!updated) throw new OrderStateConflictError();

        if (nextStatus === "cancelled") {
          const releasedAt = now();
          const isFirstRelease = await dependencies.store.claimStockRelease(
            orderId,
            releasedAt,
            transaction
          );

          if (isFirstRelease) {
            // Keep session operations sequential: a failed increment aborts both status and release claim.
            for (const item of updated.items) {
              await dependencies.store.restoreProductStock(
                item.productId,
                item.quantity,
                transaction
              );
            }
            return { ...updated, stockReleasedAt: releasedAt };
          }
        }

        return updated;
      });
    },
  };
}

export const orderService = createOrderService({ store: createMongoOrderStore() });
