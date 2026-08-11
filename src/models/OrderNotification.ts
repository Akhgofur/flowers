import mongoose, { type Model, type Types } from "mongoose";
import type { OrderNotificationStatus } from "@/lib/contracts";

const { model, models, Schema } = mongoose;

export type OrderNotificationDocument = {
  orderId: Types.ObjectId;
  channel: "telegram";
  status: OrderNotificationStatus;
  attempts: number;
  nextAttemptAt?: Date;
  claimedAt?: Date;
  sentAt?: Date;
  lastErrorCode?: string;
  createdAt: Date;
  updatedAt: Date;
};

const orderNotificationSchema = new Schema<OrderNotificationDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    channel: { type: String, enum: ["telegram"], required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "sent", "failed"],
      required: true,
      default: "pending",
    },
    attempts: { type: Number, required: true, min: 0, default: 0 },
    nextAttemptAt: { type: Date },
    claimedAt: { type: Date },
    sentAt: { type: Date },
    lastErrorCode: { type: String, trim: true, maxlength: 64 },
  },
  { timestamps: true, versionKey: false }
);

orderNotificationSchema.index({ orderId: 1, channel: 1 }, { unique: true });
orderNotificationSchema.index({ status: 1, nextAttemptAt: 1 });

export const OrderNotificationModel =
  (models.OrderNotification as Model<OrderNotificationDocument> | undefined) ??
  model<OrderNotificationDocument>("OrderNotification", orderNotificationSchema);
