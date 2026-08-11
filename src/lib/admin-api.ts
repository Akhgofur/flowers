import "server-only";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { getAuthOptions } from "@/lib/auth";
import { env } from "@/lib/env";

export class AdminUnauthorizedError extends Error {
  readonly status = 401;

  constructor() {
    super("Administrator sessiyasi talab qilinadi.");
    this.name = "AdminUnauthorizedError";
  }
}

export class AdminForbiddenError extends Error {
  readonly status = 403;

  constructor(message = "Bu amal uchun ruxsat yo'q.") {
    super(message);
    this.name = "AdminForbiddenError";
  }
}

export class AdminNotFoundError extends Error {
  readonly status = 404;

  constructor(message = "Topilmadi.") {
    super(message);
    this.name = "AdminNotFoundError";
  }
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export async function requireAdmin(): Promise<void> {
  const session = await getServerSession(getAuthOptions());
  const email = session?.user?.email;

  if (!email || normalizeEmail(email) !== normalizeEmail(env.ADMIN_EMAIL)) {
    throw new AdminUnauthorizedError();
  }
}

/** JSON admin writes are same-origin only; credentialed cross-site fetches fail closed. */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;

  if (origin !== new URL(request.url).origin) {
    throw new AdminForbiddenError("Cross-site admin so'rovi rad etildi.");
  }
}

export function adminErrorResponse(error: unknown): NextResponse {
  if (
    error instanceof AdminUnauthorizedError ||
    error instanceof AdminForbiddenError ||
    error instanceof AdminNotFoundError
  ) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11_000
  ) {
    return NextResponse.json(
      { error: "Bu slug yoki qiymat allaqachon ishlatilgan." },
      { status: 409 }
    );
  }

  const orderErrorCodes = new Set([
    "ORDER_TRANSITION_INVALID",
    "ORDER_STATE_CONFLICT",
    "ORDER_NOT_FOUND",
    "PRODUCT_UNAVAILABLE",
    "PRODUCT_OUT_OF_SEASON",
    "NOTIFICATION_NOT_RETRYABLE",
  ]);
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    "status" in error
  ) {
    const candidate = error as { code?: unknown; message?: unknown; status?: unknown };
    if (
      typeof candidate.code === "string" &&
      orderErrorCodes.has(candidate.code) &&
      typeof candidate.message === "string" &&
      typeof candidate.status === "number" &&
      Number.isInteger(candidate.status) &&
      candidate.status >= 400 &&
      candidate.status < 500
    ) {
      return NextResponse.json({ error: candidate.message }, { status: candidate.status });
    }
  }

  console.error("Admin API request failed", error);
  return NextResponse.json(
    { error: "Administrator amali vaqtincha bajarilmadi." },
    { status: 500 }
  );
}
