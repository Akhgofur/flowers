import { beforeEach, describe, expect, it, vi } from "vitest";

const catalogService = vi.hoisted(() => ({
  getPublishedProductBySlug: vi.fn(),
}));

vi.mock("@/lib/services/catalog-service", () => catalogService);

import { GET } from "./route";

describe("GET /api/products/[slug]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes the validated locale and stable slug to the service", async () => {
    catalogService.getPublishedProductBySlug.mockResolvedValue({
      id: "507f1f77bcf86cd799439011",
      slug: "scarlet-roses",
      name: "Scarlet rose bouquet",
    });

    const response = await GET(
      new Request("http://localhost/api/products/scarlet-roses?locale=en"),
      { params: Promise.resolve({ slug: "scarlet-roses" }) }
    );

    expect(response.status).toBe(200);
    expect(catalogService.getPublishedProductBySlug).toHaveBeenCalledWith(
      "en",
      "scarlet-roses"
    );
  });

  it("rejects an unsupported locale", async () => {
    const response = await GET(
      new Request("http://localhost/api/products/scarlet-roses?locale=de"),
      { params: Promise.resolve({ slug: "scarlet-roses" }) }
    );

    expect(response.status).toBe(400);
    expect(catalogService.getPublishedProductBySlug).not.toHaveBeenCalled();
  });
});
