import mongoose, { type Model, type Types } from "mongoose";
import type { OrderStatus, PaymentMethod } from "@/lib/contracts";
import { LOCALES, type Locale } from "@/i18n/config";

export { allowedOrderTransitions } from "@/lib/contracts";

const { model, models, Schema } = mongoose;

export type OrderCustomer = {
  fullName: string;
  phone: string;
  address: string;
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
  items: OrderItemSnapshot[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: "unpaid";
  status: OrderStatus;
  stockReleasedAt?: Date;
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

const orderCustomerSchema = new Schema<OrderCustomer>(
  {
    fullName: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 32 },
    address: { type: String, required: true, trim: true, minlength: 8, maxlength: 500 },
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
    stockReleasedAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

orderSchema.index({ number: 1 }, { unique: true });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ "customer.phone": 1, createdAt: -1 });

export const OrderModel =
  (models.Order as Model<OrderDocument> | undefined) ??
  model<OrderDocument>("Order", orderSchema);
