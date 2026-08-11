import { beforeEach, describe, expect, it, vi } from "vitest";

const adminApi = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  assertSameOrigin: vi.fn(),
  adminErrorResponse: vi.fn(),
}));
const service = vi.hoisted(() => ({
  updateAdminHomeSection: vi.fn(),
  removeAdminHomeSection: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => adminApi);
vi.mock("@/lib/services/home-section-service", () => service);

import { DELETE, PATCH } from "./route";

const id = "507f1f77bcf86cd799439021";
const context = { params: Promise.resolve({ id }) };

describe("admin home-section item API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.requireAdmin.mockResolvedValue(undefined);
    adminApi.assertSameOrigin.mockReturnValue(undefined);
    adminApi.adminErrorResponse.mockReturnValue(new Response(null, { status: 500 }));
  });

  it("validates and forwards only an accepted partial update", async () => {
    service.updateAdminHomeSection.mockResolvedValue({ id, status: "draft" });
    const response = await PATCH(
      new Request(`http://localhost/api/admin/home-sections/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "draft", endsAt: null }),
      }),
      context
    );

    expect(response.status).toBe(200);
    expect(service.updateAdminHomeSection).toHaveBeenCalledWith(id, {
      status: "draft",
      endsAt: null,
    });
    expect(adminApi.assertSameOrigin).toHaveBeenCalledTimes(1);
  });

  it("deletes a valid section after auth and same-origin checks", async () => {
    const response = await DELETE(
      new Request(`http://localhost/api/admin/home-sections/${id}`, {
        method: "DELETE",
      }),
      context
    );

    expect(response.status).toBe(204);
    expect(service.removeAdminHomeSection).toHaveBeenCalledWith(id);
    expect(adminApi.requireAdmin).toHaveBeenCalledTimes(1);
    expect(adminApi.assertSameOrigin).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid id before a repository mutation", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/admin/home-sections/not-an-id", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "not-an-id" }) }
    );

    expect(response.status).toBe(400);
    expect(service.removeAdminHomeSection).not.toHaveBeenCalled();
  });
});
