import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogProduct } from "@/lib/contracts";

const repository = vi.hoisted(() => ({
  findPublishedCatalogProducts: vi.fn(),
  findPublishedProductBySlug: vi.fn(),
  findPublishedCategories: vi.fn(),
}));

vi.mock("@/lib/repositories/catalog-repository", () => repository);

import {
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
  stockQuantity: 12,
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

    const products = await getPublishedCatalog({
      category: undefined,
      sale: false,
      query: "",
    });

    expect(products).toEqual([publishedProduct]);
    expect(repository.findPublishedCatalogProducts).toHaveBeenCalledWith({
      category: undefined,
      sale: false,
      query: undefined,
      page: 1,
      limit: 24,
    });
  });

  it("maps an unknown slug to null rather than leaking a draft", async () => {
    repository.findPublishedProductBySlug.mockResolvedValue(null);

    await expect(getPublishedProductBySlug("unknown-or-draft")).resolves.toBeNull();
  });

  it("returns only published categories from the repository boundary", async () => {
    repository.findPublishedCategories.mockResolvedValue([
      { id: "1", name: "Lolalar", slug: "tulips", order: 1, status: "published" },
    ]);

    await expect(getPublishedCategories()).resolves.toEqual([
      { id: "1", name: "Lolalar", slug: "tulips", order: 1, status: "published" },
    ]);
  });
});
