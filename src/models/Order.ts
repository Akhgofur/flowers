import mongoose, { type Model, type Types } from "mongoose";
import {
  FULFILMENT_METHODS,
  type FulfilmentMethod,
  type OrderStatus,
  type PaymentMethod,
} from "@/lib/contracts";
import { LOCALES, type Locale } from "@/i18n/config";
import type { GeoPoint } from "@/shared/geo-point";

export { allowedOrderTransitions } from "@/lib/contracts";

const { model, models, Schema } = mongoose;

export type OrderCustomer = {
  fullName: string;
  phone: string;
  /** Absent on a collected order; the shopper comes to the shop. */
  address?: string;
  location?: GeoPoint;
  deliveryDate?: Date;
  comment?: string;
};

export type OrderItemSnapshot = {
  productId: Types.ObjectId;
  slug: string;
  name: string;
  imageUrl: string;
  unitPrice?: number;
  quantity: number;
  lineTotal?: number;
};

export type OrderDocument = {
  number: string;
  locale: Locale;
  customer: OrderCustomer;
  fulfilment: FulfilmentMethod;
  items: OrderItemSnapshot[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: "unpaid";
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
};

const integerMoneyField = {
  type: Number,
  required: true,
  min: 0,
  validate: {
    validator: (value: number) => Number.isInteger(value),
    message: "Money values must be non-negative integers.",
  },
};

const orderItemSchema = new Schema<OrderItemSnapshot>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    slug: { type: String, required: true, trim: true, maxlength: 120 },
    name: { type: String, required: true, trim: true, maxlength: 140 },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
      match: /^https:\/\//,
    },
    unitPrice: { ...integerMoneyField, required: false },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 99,
      validate: {
        validator: (value: number) => Number.isInteger(value),
        message: "Quantity must be an integer between 1 and 99.",
      },
    },
    lineTotal: { ...integerMoneyField, required: false },
  },
  { _id: false }
);

const orderLocationSchema = new Schema<GeoPoint>(
  {
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false }
);

const orderCustomerSchema = new Schema<OrderCustomer>(
  {
    fullName: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 32 },
    address: { type: String, trim: true, minlength: 8, maxlength: 500 },
    // Optional: orders placed before the map picker existed have no pin, and a
    // shopper on a desktop browser may still decline to share one.
    location: { type: orderLocationSchema, required: false },
    deliveryDate: { type: Date },
    comment: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const orderSchema = new Schema<OrderDocument>(
  {
    number: { type: String, required: true, trim: true, maxlength: 64 },
    locale: {
      type: String,
      required: true,
      enum: LOCALES,
      default: "ru",
    },
    customer: { type: orderCustomerSchema, required: true },
    fulfilment: {
      type: String,
      required: true,
      enum: FULFILMENT_METHODS,
      default: "delivery",
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (value: OrderItemSnapshot[]) => value.length > 0 && value.length <= 20,
        message: "An order must contain between 1 and 20 items.",
      },
    },
    subtotal: integerMoneyField,
    deliveryFee: integerMoneyField,
    total: integerMoneyField,
    paymentMethod: {
      type: String,
      required: true,
      enum: ["cash_on_delivery", "card_on_delivery"],
    },
    paymentStatus: { type: String, required: true, enum: ["unpaid"], default: "unpaid" },
    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "delivering",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
  },
  { timestamps: true, versionKey: false }
);

/**
 * The rule cannot live on `address` itself. That field belongs to
 * `orderCustomerSchema`, and inside a subdocument validator `this` is the
 * subdocument, which cannot see `fulfilment` on the order above it. Raising the
 * check to the parent also means it holds for any write, not only for writes
 * that arrived through the checkout route.
 */
orderSchema.pre("validate", function () {
  if (this.fulfilment === "delivery" && !this.customer?.address?.trim()) {
    this.invalidate("customer.address", "A delivery order needs an address.");
  }
});

orderSchema.index({ number: 1 }, { unique: true });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ "customer.phone": 1, createdAt: -1 });

export const OrderModel =
  (models.Order as Model<OrderDocument> | undefined) ??
  model<OrderDocument>("Order", orderSchema);
