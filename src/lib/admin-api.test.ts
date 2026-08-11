import { describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getAuthOptions: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { ADMIN_EMAIL: "admin@example.com" } }));

import { adminErrorResponse } from "@/lib/admin-api";

describe("adminErrorResponse", () => {
  it.each([
    "PRODUCT_OUT_OF_SEASON",
    "NOTIFICATION_NOT_RETRYABLE",
  ])("preserves the %s conflict response", async (code) => {
    const response = adminErrorResponse(
      Object.assign(new Error("Conflict"), { code, status: 409 })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "Conflict" });
  });
});
