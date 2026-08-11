import { beforeEach, describe, expect, it, vi } from "vitest";

const catalogService = vi.hoisted(() => ({
  getPublishedCategories: vi.fn(),
}));

vi.mock("@/lib/services/catalog-service", () => catalogService);

import { GET } from "./route";

describe("GET /api/categories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns categories in the requested locale", async () => {
    catalogService.getPublishedCategories.mockResolvedValue([
      { id: "1", slug: "roses", name: "Розы", order: 0, status: "published" },
    ]);

    const response = await GET(
      new Request("http://localhost/api/categories?locale=ru")
    );

    expect(response.status).toBe(200);
    expect(catalogService.getPublishedCategories).toHaveBeenCalledWith("ru");
  });

  it("rejects unsupported locales", async () => {
    const response = await GET(
      new Request("http://localhost/api/categories?locale=fr")
    );

    expect(response.status).toBe(400);
    expect(catalogService.getPublishedCategories).not.toHaveBeenCalled();
  });
});
