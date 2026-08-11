import { describe, expect, it, vi } from "vitest";

const outbox = vi.hoisted(() => ({
  retryDue: vi.fn().mockResolvedValue({ attempted: 1, sent: 1, failed: 0 }),
}));
vi.mock("@/lib/services/order-notification-outbox-service", () => ({
  orderNotificationOutboxService: outbox,
}));
vi.mock("@/lib/env", () => ({ env: { CRON_SECRET: "cron-secret" } }));

import { GET } from "./route";

describe("notification retry cron", () => {
  it("rejects a request without the configured bearer secret", async () => {
    const response = await GET(
      new Request("http://localhost/api/internal/order-notifications/retry")
    );

    expect(response.status).toBe(401);
    expect(outbox.retryDue).not.toHaveBeenCalled();
  });

  it("processes at most twenty due notifications for an authorized request", async () => {
    const response = await GET(
      new Request("http://localhost/api/internal/order-notifications/retry", {
        headers: { authorization: "Bearer cron-secret" },
      })
    );

    expect(response.status).toBe(200);
    expect(outbox.retryDue).toHaveBeenCalledWith(20);
  });
});
