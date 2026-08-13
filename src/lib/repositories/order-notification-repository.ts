import "server-only";
import mongoose, { type Types } from "mongoose";
import type { NewOrderNotification } from "@/lib/services/order-notification-service";
import { dbConnect } from "@/lib/mongodb";
import { OrderModel, type OrderDocument } from "@/models/Order";
import {
  OrderNotificationModel,
  type OrderNotificationDocument,
} from "@/models/OrderNotification";

type NotificationRecord = OrderNotificationDocument & { _id: Types.ObjectId };
type OrderRecord = OrderDocument & { _id: Types.ObjectId };

export type ClaimedNotificationRecord = {
  id: string;
  orderId: string;
  channel: "telegram";
  status: "processing";
  attempts: number;
};

function serializeClaim(document: NotificationRecord): ClaimedNotificationRecord {
  return {
    id: document._id.toString(),
    orderId: document.orderId.toString(),
    channel: "telegram",
    status: "processing",
    attempts: document.attempts,
  };
}

const dueStatuses = ["pending", "failed"] as const;

async function claimOne(query: Record<string, unknown>, now: Date) {
  await dbConnect();
  const document = (await OrderNotificationModel.findOneAndUpdate(
    {
      ...query,
      status: { $in: dueStatuses },
      attempts: { $lt: 10 },
      nextAttemptAt: { $lte: now },
    },
    {
      $set: { status: "processing", claimedAt: now },
      $inc: { attempts: 1 },
    },
    { new: true, sort: { nextAttemptAt: 1, _id: 1 } }
  )
    .lean()
    .exec()) as unknown as NotificationRecord | null;
  return document ? serializeClaim(document) : null;
}

export const claimNotificationForOrder = (orderId: string, now: Date) =>
  mongoose.isValidObjectId(orderId)
    ? claimOne({ orderId, channel: "telegram" }, now)
    : Promise.resolve(null);

export const claimNextDueNotification = (now: Date) => claimOne({}, now);

export async function resetStaleNotificationClaims(
  staleBefore: Date,
  now: Date
): Promise<number> {
  await dbConnect();
  const result = await OrderNotificationModel.updateMany(
    { status: "processing", claimedAt: { $lte: staleBefore } },
    {
      $set: {
        status: "failed",
        nextAttemptAt: now,
        lastErrorCode: "CLAIM_TIMEOUT",
      },
      $unset: { claimedAt: 1 },
    }
  ).exec();
  return result.modifiedCount;
}

export async function loadOrderNotification(
  orderId: string
): Promise<NewOrderNotification | null> {
  await dbConnect();
  if (!mongoose.isValidObjectId(orderId)) return null;
  const document = (await OrderModel.findById(orderId).lean().exec()) as unknown as
    | OrderRecord
    | null;
  if (!document) return null;

  return {
    orderNumber: document.number,
    total: document.total,
    paymentMethod: document.paymentMethod,
    items: document.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      imageUrl: item.imageUrl,
      ...(item.lineTotal === undefined ? {} : { lineTotal: item.lineTotal }),
    })),
    customer: {
      fullName: document.customer.fullName,
      phone: document.customer.phone,
      address: document.customer.address,
      ...(document.customer.location === undefined
        ? {}
        : {
            location: {
              latitude: document.customer.location.latitude,
              longitude: document.customer.location.longitude,
            },
          }),
      ...(document.customer.deliveryDate === undefined
        ? {}
        : { deliveryDate: document.customer.deliveryDate.toISOString().slice(0, 10) }),
      ...(document.customer.comment === undefined
        ? {}
        : { comment: document.customer.comment }),
    },
  };
}

export async function markNotificationSent(id: string, sentAt: Date): Promise<void> {
  await dbConnect();
  await OrderNotificationModel.updateOne(
    { _id: id, status: "processing" },
    {
      $set: { status: "sent", sentAt },
      $unset: { claimedAt: 1, nextAttemptAt: 1, lastErrorCode: 1 },
    }
  ).exec();
}

export async function markNotificationFailed(
  id: string,
  errorCode: string,
  nextAttemptAt?: Date
): Promise<void> {
  await dbConnect();
  await OrderNotificationModel.updateOne(
    { _id: id, status: "processing" },
    {
      $set: {
        status: "failed",
        lastErrorCode: errorCode,
        ...(nextAttemptAt === undefined ? {} : { nextAttemptAt }),
      },
      $unset: {
        claimedAt: 1,
        ...(nextAttemptAt === undefined ? { nextAttemptAt: 1 } : {}),
      },
    }
  ).exec();
}

export async function scheduleNotificationRetry(orderId: string, now: Date): Promise<void> {
  await dbConnect();
  const result = await OrderNotificationModel.updateOne(
    { orderId, channel: "telegram", status: { $in: ["pending", "failed"] } },
    {
      $set: { status: "pending", nextAttemptAt: now },
      $unset: { claimedAt: 1, lastErrorCode: 1 },
    }
  ).exec();
  if (result.matchedCount === 0) {
    throw Object.assign(new Error("Notification cannot be retried."), {
      status: 409,
      code: "NOTIFICATION_NOT_RETRYABLE",
    });
  }
}
