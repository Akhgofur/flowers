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

const CHECKOUT_RATE_LIMIT = {
  namespace: "checkout",
  limit: 5,
  windowMs: 15 * 60 * 1_000,
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
    const decision = await rateLimiter.consume({
      ...CHECKOUT_RATE_LIMIT,
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
          headers: rateLimitHeaders(decision.limit, decision.remaining),
        }
      );
    }

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
