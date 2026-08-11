import { describe, expect, it } from "vitest";
import type { CatalogProduct, PublicHomeSection } from "@/lib/contracts";
import {
  createHomeMerchandisingService,
  type HomeMerchandisingStore,
} from "./home-merchandising-service";

function product(
  id: string,
  options: Partial<CatalogProduct> = {}
): CatalogProduct {
  return {
    id,
    name: `Product ${id}`,
    slug: `product-${id}`,
    shortDescription: "Seasonal flower composition.",
    description: "A carefully arranged seasonal flower composition.",
    composition: ["Flowers"],
    price: 100_000,
    currency: "UZS",
    images: [{ url: "https://images.pexels.com/photos/123/flower.jpg", alt: `Product ${id}` }],
    categorySlug: "bouquets",
    flowerTypes: ["mixed"],
    colors: ["pink"],
    seasons: ["all_year"],
    stockQuantity: 4,
    sortOrder: 0,
    isFeatured: false,
    isNew: false,
    isOnSale: false,
    status: "published",
    ...options,
  };
}

const section: PublicHomeSection = {
  id: "section-1",
  title: "Top flowers",
  productIds: ["c", "a", "missing"],
  sortOrder: 1,
};

function createStore(): HomeMerchandisingStore {
  const products = [
    product("a"),
    product("b"),
    product("c"),
    product("unavailable", { seasons: ["winter"] }),
  ];
  return {
    listSections: async () => [section],
    listBestSellerProductIds: async () => ["b", "unavailable", "a"],
    findProductsByIds: async (_locale, ids) =>
      products.filter((item) => ids.includes(item.id)),
    listRecommendationCandidates: async () => [
      { product: product("featured-new", { isFeatured: true, sortOrder: 2 }), updatedAt: "2026-08-10T00:00:00.000Z" },
      { product: product("featured-first", { isFeatured: true, sortOrder: 1 }), updatedAt: "2026-08-01T00:00:00.000Z" },
      { product: product("newest"), updatedAt: "2026-08-11T00:00:00.000Z" },
      { product: product("older"), updatedAt: "2026-08-09T00:00:00.000Z" },
      { product: product("winter", { seasons: ["winter"] }), updatedAt: "2026-08-12T00:00:00.000Z" },
    ],
  };
}

describe("home merchandising service", () => {
  it("preserves manual and sales rank while excluding unavailable products", async () => {
    const service = createHomeMerchandisingService({ store: createStore() });

    const result = await service.getHomePageCatalogData(
      "en",
      new Date("2026-08-11T10:00:00.000Z")
    );

    expect(result.dynamicSections).toEqual([
      {
        ...section,
        products: [expect.objectContaining({ id: "c" }), expect.objectContaining({ id: "a" })],
      },
    ]);
    expect(result.bestSellers.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("orders featured recommendations first and fills to four with newest available products", async () => {
    const service = createHomeMerchandisingService({ store: createStore() });

    const result = await service.getHomePageCatalogData(
      "en",
      new Date("2026-08-11T10:00:00.000Z")
    );

    expect(result.recommended.map((item) => item.id)).toEqual([
      "featured-first",
      "featured-new",
      "newest",
      "older",
    ]);
  });
});
