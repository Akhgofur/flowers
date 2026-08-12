import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogProduct } from "@/lib/contracts";

const repository = vi.hoisted(() => ({
  findPublishedCatalogProducts: vi.fn(),
  findPublishedProductBySlug: vi.fn(),
  findPublishedCategories: vi.fn(),
}));

vi.mock("@/lib/repositories/catalog-repository", () => repository);

import {
  CATALOG_PAGE_LIMIT,
  getEntirePublishedCatalog,
  getPublishedCatalog,
  getPublishedCategories,
  getPublishedProductBySlug,
} from "./catalog-service";

const publishedProduct: CatalogProduct = {
  id: "507f1f77bcf86cd799439011",
  name: "Pushti lola buketi",
  slug: "pushti-lola-buketi",
  shortDescription: "Yangi lolalardan tuzilgan mayin kompozitsiya.",
  description: "Bayram va yaqin insonlar uchun nafis sovg‘a.",
  composition: ["Lola", "Yashil barglar"],
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

describe("public catalog service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("never returns draft or archived products from the public catalog", async () => {
    repository.findPublishedCatalogProducts.mockResolvedValue([
      publishedProduct,
      { ...publishedProduct, id: "draft", slug: "draft", status: "draft" },
      { ...publishedProduct, id: "archived", slug: "archived", status: "archived" },
    ]);

    const products = await getPublishedCatalog("en", {
      category: undefined,
      sale: false,
      query: "",
    });

    expect(products).toEqual([publishedProduct]);
    expect(repository.findPublishedCatalogProducts).toHaveBeenCalledWith(
      "en",
      {
        category: undefined,
        sale: false,
        query: undefined,
        page: 1,
        limit: 24,
      }
    );
  });

  it("maps an unknown slug to null rather than leaking a draft", async () => {
    repository.findPublishedProductBySlug.mockResolvedValue(null);

    await expect(
      getPublishedProductBySlug("ru", "unknown-or-draft")
    ).resolves.toBeNull();
    expect(repository.findPublishedProductBySlug).toHaveBeenCalledWith(
      "ru",
      "unknown-or-draft"
    );
  });

  it("keeps published unavailable products visible for detail and inquiry journeys", async () => {
    const unavailable = {
      ...publishedProduct,
      price: undefined,
      seasons: ["winter"] as const,
    };
    repository.findPublishedCatalogProducts.mockResolvedValue([unavailable]);
    repository.findPublishedProductBySlug.mockResolvedValue(unavailable);

    await expect(getPublishedCatalog("ru", {})).resolves.toEqual([unavailable]);
    await expect(
      getPublishedProductBySlug("ru", unavailable.slug)
    ).resolves.toEqual(unavailable);
  });

  describe("getEntirePublishedCatalog", () => {
    const pageOf = (count: number, offset: number) =>
      Array.from({ length: count }, (_, index) => ({
        ...publishedProduct,
        id: `product-${offset + index}`,
        slug: `product-${offset + index}`,
      }));

    it("returns a single short page without asking for another", async () => {
      repository.findPublishedCatalogProducts.mockResolvedValueOnce(pageOf(3, 0));

      const result = await getEntirePublishedCatalog("ru");

      expect(result.products).toHaveLength(3);
      expect(result.truncated).toBe(false);
      expect(repository.findPublishedCatalogProducts).toHaveBeenCalledTimes(1);
    });

    // A catalog larger than one page used to be silently cut off at the limit.
    it("pages past the per-request limit until the catalog is exhausted", async () => {
      repository.findPublishedCatalogProducts
        .mockResolvedValueOnce(pageOf(CATALOG_PAGE_LIMIT, 0))
        .mockResolvedValueOnce(pageOf(CATALOG_PAGE_LIMIT, CATALOG_PAGE_LIMIT))
        .mockResolvedValueOnce(pageOf(7, CATALOG_PAGE_LIMIT * 2));

      const result = await getEntirePublishedCatalog("ru");

      expect(result.products).toHaveLength(CATALOG_PAGE_LIMIT * 2 + 7);
      expect(result.truncated).toBe(false);
      expect(repository.findPublishedCatalogProducts).toHaveBeenCalledTimes(3);
      expect(repository.findPublishedCatalogProducts).toHaveBeenNthCalledWith(
        2,
        "ru",
        expect.objectContaining({ page: 2, limit: CATALOG_PAGE_LIMIT })
      );
    });

    it("reports truncation instead of looping forever on a runaway catalog", async () => {
      // Every page is full and distinct, so the loop can only end at its budget.
      repository.findPublishedCatalogProducts.mockImplementation(
        (_locale: unknown, filters: { page: number }) =>
          Promise.resolve(
            pageOf(CATALOG_PAGE_LIMIT, (filters.page - 1) * CATALOG_PAGE_LIMIT)
          )
      );

      const result = await getEntirePublishedCatalog("ru");

      expect(result.truncated).toBe(true);
      expect(result.products.length).toBeGreaterThan(CATALOG_PAGE_LIMIT);
      expect(repository.findPublishedCatalogProducts.mock.calls.length).toBeLessThan(50);
    });

    it("does not repeat a product when pages overlap", async () => {
      repository.findPublishedCatalogProducts
        .mockResolvedValueOnce(pageOf(CATALOG_PAGE_LIMIT, 0))
        .mockResolvedValueOnce(pageOf(2, CATALOG_PAGE_LIMIT - 1));

      const result = await getEntirePublishedCatalog("ru");

      expect(new Set(result.products.map((p) => p.id)).size).toBe(
        result.products.length
      );
    });
  });

  it("returns only published categories from the repository boundary", async () => {
    repository.findPublishedCategories.mockResolvedValue([
      { id: "1", name: "Lolalar", slug: "tulips", order: 1, status: "published" },
    ]);

    await expect(getPublishedCategories("uz")).resolves.toEqual([
      { id: "1", name: "Lolalar", slug: "tulips", order: 1, status: "published" },
    ]);
    expect(repository.findPublishedCategories).toHaveBeenCalledWith("uz");
  });
});
