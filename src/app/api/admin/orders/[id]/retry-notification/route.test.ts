import { describe, expect, it, vi } from "vitest";

const adminApi = vi.hoisted(() => ({
  requireAdmin: vi.fn().mockResolvedValue(undefined),
  assertSameOrigin: vi.fn(),
  adminErrorResponse: vi.fn().mockReturnValue(new Response(null, { status: 500 })),
}));
const outbox = vi.hoisted(() => ({ retryForOrder: vi.fn() }));
vi.mock("@/lib/admin-api", () => adminApi);
vi.mock("@/lib/services/order-notification-outbox-service", () => ({
  orderNotificationOutboxService: outbox,
}));

import { POST } from "./route";

describe("admin order notification retry", () => {
  it("requires admin and same-origin before scheduling an immediate retry", async () => {
    outbox.retryForOrder.mockResolvedValue({ attempted: 1, sent: 1, failed: 0 });
    const id = "507f1f77bcf86cd799439021";
    const response = await POST(
      new Request(`http://localhost/api/admin/orders/${id}/retry-notification`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id }) }
    );

    expect(response.status).toBe(200);
    expect(adminApi.requireAdmin).toHaveBeenCalledTimes(1);
    expect(adminApi.assertSameOrigin).toHaveBeenCalledTimes(1);
    expect(outbox.retryForOrder).toHaveBeenCalledWith(id);
  });
});
