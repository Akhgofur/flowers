import { beforeEach, describe, expect, it, vi } from "vitest";

const adminApi = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  assertSameOrigin: vi.fn(),
  adminErrorResponse: vi.fn(),
}));
const service = vi.hoisted(() => ({
  getAdminHomeSections: vi.fn(),
  createAdminHomeSection: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => adminApi);
vi.mock("@/lib/services/home-section-service", () => service);

import { GET, POST } from "./route";

const section = {
  id: "507f1f77bcf86cd799439021",
  translations: {
    ru: { title: "Топ цветов" },
    uz: { title: "Top gullar" },
    en: { title: "Top flowers" },
  },
  productIds: ["507f1f77bcf86cd799439011"],
  sortOrder: 0,
  status: "published",
  createdAt: "2026-08-11T10:00:00.000Z",
  updatedAt: "2026-08-11T10:00:00.000Z",
};

describe("admin home-sections API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.requireAdmin.mockResolvedValue(undefined);
    adminApi.assertSameOrigin.mockReturnValue(undefined);
    adminApi.adminErrorResponse.mockReturnValue(new Response(null, { status: 500 }));
  });

  it("requires admin auth before listing sections", async () => {
    service.getAdminHomeSections.mockResolvedValue([section]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ sections: [section] });
    expect(adminApi.requireAdmin).toHaveBeenCalledTimes(1);
  });

  it("requires same-origin and validates before creating a section", async () => {
    service.createAdminHomeSection.mockResolvedValue(section);
    const response = await POST(
      new Request("http://localhost/api/admin/home-sections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          translations: section.translations,
          productIds: section.productIds,
          sortOrder: 0,
          status: "published",
        }),
      })
    );

    expect(response.status).toBe(201);
    expect(adminApi.assertSameOrigin).toHaveBeenCalledTimes(1);
    expect(service.createAdminHomeSection).toHaveBeenCalledWith(
      expect.objectContaining({ productIds: section.productIds })
    );
  });
});
