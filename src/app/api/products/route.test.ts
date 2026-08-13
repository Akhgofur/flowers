import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogProduct } from "@/lib/contracts";

const catalogService = vi.hoisted(() => ({
  getPublishedCatalog: vi.fn(),
  getPublishedProductsByIds: vi.fn(),
}));

vi.mock("@/lib/services/catalog-service", () => catalogService);

import { GET } from "./route";

const product: CatalogProduct = {
  id: "507f1f77bcf86cd799439011",
  name: "Pushti lola buketi",
  slug: "pushti-lola-buketi",
  shortDescription: "Yangi lolalardan tuzilgan mayin kompozitsiya.",
  description: "Bayram va yaqin insonlar uchun nafis sovg‘a.",
  composition: ["Lola"],
  price: 150_000,
  currency: "UZS",
  images: [
    {
      url: "https://images.pexels.com/photos/1234567/tulips.jpg",
      alt: "Pushti lolalardan tayyorlangan buket",
    },
  ],
  categorySlug: "tulips",
  flowerTypes: ["tulip"],
  colors: ["pink"],
  seasons: ["all_year"],
  sortOrder: 2,
  isFeatured: false,
  isNew: true,
  isOnSale: false,
  status: "published",
};

describe("GET /api/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates query parameters before delegating to the public service", async () => {
    catalogService.getPublishedCatalog.mockResolvedValue([product]);

    const response = await GET(
      new Request("http://localhost/api/products?locale=en&category=tulips&sale=true&page=2&limit=12")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ products: [product] });
    expect(catalogService.getPublishedCatalog).toHaveBeenCalledWith("en", {
      category: "tulips",
      sale: true,
      query: undefined,
      page: 2,
      limit: 12,
    });
  });

  it("returns 400 for malformed public query strings", async () => {
    const response = await GET(
      new Request("http://localhost/api/products?sale=yes&limit=49")
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.any(String) });
    expect(catalogService.getPublishedCatalog).not.toHaveBeenCalled();
  });

  it("rejects unsupported locales before calling the catalog service", async () => {
    const response = await GET(
      new Request("http://localhost/api/products?locale=de")
    );

    expect(response.status).toBe(400);
    expect(catalogService.getPublishedCatalog).not.toHaveBeenCalled();
  });
});

/**
 * The cart lives in browser storage, so a page that only knows its own products
 * cannot name the rest of the basket. These lookups let it ask for exactly the
 * lines it is missing instead of shipping the whole catalog to every route.
 */
describe("GET /api/products?ids", () => {
  const OTHER_ID = "507f1f77bcf86cd799439012";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the requested products and ignores catalog paging", async () => {
    catalogService.getPublishedProductsByIds.mockResolvedValue([product]);

    const response = await GET(
      new Request(`http://localhost/api/products?locale=en&ids=${product.id},${OTHER_ID}`)
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ products: [product] });
    expect(catalogService.getPublishedProductsByIds).toHaveBeenCalledWith("en", [
      product.id,
      OTHER_ID,
    ]);
    expect(catalogService.getPublishedCatalog).not.toHaveBeenCalled();
  });

  it("rejects identifiers that are not ObjectIds", async () => {
    const response = await GET(
      new Request("http://localhost/api/products?ids=not-an-object-id")
    );

    expect(response.status).toBe(400);
    expect(catalogService.getPublishedProductsByIds).not.toHaveBeenCalled();
  });

  it("caps how many products one request may ask for", async () => {
    const ids = Array.from({ length: 101 }, (_, index) =>
      `507f1f77bcf86cd7994${index.toString().padStart(5, "0")}`
    ).join(",");

    const response = await GET(new Request(`http://localhost/api/products?ids=${ids}`));

    expect(response.status).toBe(400);
    expect(catalogService.getPublishedProductsByIds).not.toHaveBeenCalled();
  });

  it("reports catalog outages rather than pretending the basket is empty", async () => {
    catalogService.getPublishedProductsByIds.mockRejectedValue(new Error("db down"));

    const response = await GET(
      new Request(`http://localhost/api/products?ids=${product.id}`)
    );

    expect(response.status).toBe(503);
  });
});
