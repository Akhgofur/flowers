import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";
import { RateLimitExceededError, rateLimiter } from "@/lib/rate-limit";
import { orderNotificationOutboxService } from "@/lib/services/order-notification-outbox-service";
import { orderService } from "@/lib/services/order-service";
import { checkoutSchema } from "@/lib/validations";
import en from "../../../../messages/en.json";
import ru from "../../../../messages/ru.json";
import uz from "../../../../messages/uz.json";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1_000;

/**
 * The abuse ceiling, charged per address before anything is parsed. It has to sit
 * well above honest use: mobile carriers and offices put many shoppers behind one
 * public address, and a strict per-address count locks out everyone but the first.
 */
const CHECKOUT_ATTEMPT_RATE_LIMIT = {
  namespace: "checkout:attempt",
  limit: 30,
  windowMs: RATE_LIMIT_WINDOW_MS,
} as const;

/**
 * The duplicate-order guard, charged per phone number and only once a submission is
 * valid. Counting rejected submissions here would spend a shopper's whole quota on
 * their own typos — a mistyped phone is the most common thing checkout rejects.
 */
const CHECKOUT_ORDER_RATE_LIMIT = {
  namespace: "checkout:order",
  limit: 5,
  windowMs: RATE_LIMIT_WINDOW_MS,
} as const;

const PUBLIC_ORDER_ERRORS = new Set([
  "PRODUCT_UNAVAILABLE",
  "PRODUCT_OUT_OF_SEASON",
  "ORDER_NOT_FOUND",
  "ORDER_STATE_CONFLICT",
  "DUPLICATE_ORDER_ITEM",
  "INVALID_DELIVERY_DATE",
]);

const MESSAGE_CATALOGS = { ru, uz, en } as const;
type CheckoutErrorKey =
  | "errorValidation"
  | "errorRateLimit"
  | "errorUnavailable"
  | "errorService";

function checkoutError(locale: Locale, key: CheckoutErrorKey): string {
  return MESSAGE_CATALOGS[locale].Checkout[key];
}

function bodyLocale(body: unknown): Locale {
  if (typeof body !== "object" || body === null || !("locale" in body)) {
    return DEFAULT_LOCALE;
  }

  const locale = (body as { locale?: unknown }).locale;
  return isLocale(locale) ? locale : DEFAULT_LOCALE;
}

function getRequestSubject(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedAddress = forwardedFor?.split(",")[0]?.trim();
  return forwardedAddress || request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Digits only, so the same number counts once however it was typed — `+998 90 123`
 * and `998901230000` are one customer, not two quotas.
 */
function getPhoneSubject(phone: string): string {
  return `phone:${phone.replace(/\D/g, "")}`;
}

function publicOrderError(
  error: unknown
): { code: string; status: number; productId?: string } | null {
  if (typeof error !== "object" || error === null) return null;

  const candidate = error as {
    code?: unknown;
    status?: unknown;
    productId?: unknown;
  };
  if (
    typeof candidate.code !== "string" ||
    !PUBLIC_ORDER_ERRORS.has(candidate.code) ||
    typeof candidate.status !== "number" ||
    !Number.isInteger(candidate.status) ||
    candidate.status < 400 ||
    candidate.status > 499
  ) {
    return null;
  }

  // The id is public catalog data, and without it the shopper only learns that
  // "a product" failed — useless when the culprit is not the line they can see.
  return {
    code: candidate.code,
    status: candidate.status,
    ...(typeof candidate.productId === "string" && candidate.productId
      ? { productId: candidate.productId }
      : {}),
  };
}

function rateLimitHeaders(limit: number, remaining: number): HeadersInit {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
  };
}

export async function POST(request: Request) {
  let locale: Locale = DEFAULT_LOCALE;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          code: "INVALID_JSON",
          error: checkoutError(locale, "errorValidation"),
        },
        { status: 400 }
      );
    }

    locale = bodyLocale(body);
    const attempt = await rateLimiter.consume({
      ...CHECKOUT_ATTEMPT_RATE_LIMIT,
      subject: getRequestSubject(request),
    });

    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          error: checkoutError(locale, "errorValidation"),
        },
        {
          status: 400,
          headers: rateLimitHeaders(attempt.limit, attempt.remaining),
        }
      );
    }

    const decision = await rateLimiter.consume({
      ...CHECKOUT_ORDER_RATE_LIMIT,
      subject: getPhoneSubject(parsed.data.customer.phone),
    });

    const order = await orderService.createPendingOrder(parsed.data);
    // Notification providers are best effort: an already committed order must
    // never be rolled back or reported as failed because messaging is down.
    try {
      await orderNotificationOutboxService.deliverForOrder(order.orderId);
    } catch {
      console.error("Order notification dispatch failed.");
    }

    return NextResponse.json(
      { order },
      {
        status: 201,
        headers: rateLimitHeaders(decision.limit, decision.remaining),
      }
    );
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        {
          code: "RATE_LIMITED",
          error: checkoutError(locale, "errorRateLimit"),
          // "Try again later" leaves the shopper refreshing blind. The client turns
          // this into the wait it actually is.
          retryAfterSeconds: error.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
        }
      );
    }

    const safeError = publicOrderError(error);
    if (safeError) {
      return NextResponse.json(
        {
          code: safeError.code,
          error: checkoutError(
            locale,
            safeError.code === "PRODUCT_UNAVAILABLE" ||
              safeError.code === "PRODUCT_OUT_OF_SEASON"
              ? "errorUnavailable"
              : "errorValidation"
          ),
          ...(safeError.productId ? { productId: safeError.productId } : {}),
        },
        { status: safeError.status }
      );
    }

    console.error("Order creation failed", error);
    return NextResponse.json(
      {
        code: "ORDER_SERVICE_UNAVAILABLE",
        error: checkoutError(locale, "errorService"),
      },
      { status: 503 }
    );
  }
}
