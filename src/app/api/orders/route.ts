import { NextResponse } from "next/server";
import { RateLimitExceededError, rateLimiter } from "@/lib/rate-limit";
import { orderNotificationService } from "@/lib/services/order-notification-service";
import { orderService } from "@/lib/services/order-service";
import { checkoutSchema } from "@/lib/validations";

export const runtime = "nodejs";

const CHECKOUT_RATE_LIMIT = {
  namespace: "checkout",
  limit: 5,
  windowMs: 15 * 60 * 1_000,
} as const;

const PUBLIC_ORDER_ERRORS = new Set([
  "PRODUCT_UNAVAILABLE",
  "ORDER_NOT_FOUND",
  "ORDER_STATE_CONFLICT",
  "DUPLICATE_ORDER_ITEM",
  "INVALID_DELIVERY_DATE",
]);

function getRequestSubject(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedAddress = forwardedFor?.split(",")[0]?.trim();
  return forwardedAddress || request.headers.get("x-real-ip")?.trim() || "unknown";
}

function publicOrderError(error: unknown): { message: string; status: number } | null {
  if (typeof error !== "object" || error === null) return null;

  const candidate = error as { code?: unknown; message?: unknown; status?: unknown };
  if (
    typeof candidate.code !== "string" ||
    !PUBLIC_ORDER_ERRORS.has(candidate.code) ||
    typeof candidate.message !== "string" ||
    typeof candidate.status !== "number" ||
    !Number.isInteger(candidate.status) ||
    candidate.status < 400 ||
    candidate.status > 499
  ) {
    return null;
  }

  return { message: candidate.message, status: candidate.status };
}

function rateLimitHeaders(limit: number, remaining: number): HeadersInit {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
  };
}

export async function POST(request: Request) {
  try {
    const decision = await rateLimiter.consume({
      ...CHECKOUT_RATE_LIMIT,
      subject: getRequestSubject(request),
    });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Buyurtma ma'lumotlari JSON formatida bo'lishi kerak." },
        { status: 400, headers: rateLimitHeaders(decision.limit, decision.remaining) }
      );
    }

    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Buyurtma ma'lumotlarini tekshiring." },
        { status: 400, headers: rateLimitHeaders(decision.limit, decision.remaining) }
      );
    }

    const order = await orderService.createPendingOrder(parsed.data);
    // Optional provider failures are swallowed inside this best-effort service;
    // a committed order is never rolled back or rejected because a message failed.
    try {
      await orderNotificationService.notifyNewOrder({
        orderNumber: order.orderNumber,
        total: order.total,
        paymentMethod: parsed.data.paymentMethod,
        customer: parsed.data.customer,
      });
    } catch {
      // A notification adapter must never turn a committed order into a failed checkout response.
      console.error("Order notification dispatch failed.");
    }
    return NextResponse.json(
      { order },
      { status: 201, headers: rateLimitHeaders(decision.limit, decision.remaining) }
    );
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        { error: "Juda ko'p urinish bo'ldi. Birozdan keyin qayta urinib ko'ring." },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } }
      );
    }

    const safeError = publicOrderError(error);
    if (safeError) {
      return NextResponse.json(
        { error: safeError.message },
        { status: safeError.status }
      );
    }

    console.error("Order creation failed", error);
    return NextResponse.json(
      { error: "Buyurtmani hozir rasmiylashtirib bo'lmadi. Qayta urinib ko'ring." },
      { status: 503 }
    );
  }
}
