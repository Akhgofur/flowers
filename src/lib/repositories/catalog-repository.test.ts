import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import {
  buildBestSellerAggregation,
  toCatalogProduct,
} from "./catalog-repository";

describe("catalog repository mapping", () => {
  const baseRecord = {
    _id: new Types.ObjectId("507f1f77bcf86cd799439011"),
    slug: "seasonal-bouquet",
    translations: {
      ru: {
        name: "Сезонный букет",
        shortDescription: "Весенние и летние цветы.",
        description: "Сезонная авторская композиция.",
        composition: ["Цветы"],
      },
      uz: {
        name: "Mavsumiy buket",
        shortDescription: "Bahor va yoz gullari.",
        description: "Mavsumiy mualliflik kompozitsiyasi.",
        composition: ["Gullar"],
      },
      en: {
        name: "Seasonal bouquet",
        shortDescription: "Spring and summer flowers.",
        description: "A seasonal signature composition.",
        composition: ["Flowers"],
      },
    },
    categoryId: { slug: "bouquets" },
    price: 250_000,
    currency: "UZS" as const,
    images: [{ url: "https://images.pexels.com/photos/123/flower.jpg", alt: "Bouquet" }],
    flowerTypes: ["mixed"],
    colors: ["pink"],
    stockQuantity: 2,
    sortOrder: 1,
    isFeatured: false,
    isNewArrival: false,
    isOnSale: false,
    status: "published" as const,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  it("maps a defensive copy of product seasons to the public DTO", () => {
    const seasons = ["spring", "summer"] as const;
    const mapped = toCatalogProduct(
      {
        ...baseRecord,
        seasons: [...seasons],
      },
      "en"
    );

    expect(mapped?.seasons).toEqual(["spring", "summer"]);
    expect(mapped?.seasons).not.toBe(seasons);
  });

  it("treats a legacy product without seasons as all year until migration", () => {
    const mapped = toCatalogProduct(
      { ...baseRecord, seasons: undefined as never },
      "ru"
    );

    expect(mapped?.seasons).toEqual(["all_year"]);
  });

  it("ranks only delivered order items by quantity, recent delivery, then stable id", () => {
    expect(buildBestSellerAggregation()).toEqual([
      { $match: { status: "delivered" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          quantity: { $sum: "$items.quantity" },
          lastDeliveredAt: { $max: "$updatedAt" },
        },
      },
      { $sort: { quantity: -1, lastDeliveredAt: -1, _id: 1 } },
      { $project: { _id: 0, productId: { $toString: "$_id" } } },
    ]);
  });
});
