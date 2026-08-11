import { describe, expect, it } from "vitest";
import {
  checkoutSchema,
  orderStatusSchema,
  productInputSchema,
  siteSettingsInputSchema,
} from "./validations";

const validProductInput = {
  name: "Pushti lola buketi",
  slug: "pushti-lola-buketi",
  shortDescription: "Yangi lolalardan tuzilgan mayin kompozitsiya.",
  description: "Bayram va yaqin insonlar uchun nafis sovg‘a.",
  composition: ["Lola", "Yashil barglar"],
  categoryId: "507f1f77bcf86cd799439011",
  price: 150_000,
  images: [
    {
      url: "https://images.pexels.com/photos/1234567/tulips.jpg",
      alt: "Pushti lolalardan tayyorlangan buket",
    },
  ],
  flowerTypes: ["tulip"],
  colors: ["pink"],
  stockQuantity: 12,
};

describe("commerce validation boundaries", () => {
  it("rejects a browser-supplied order total and quantity above 99", () => {
    expect(() =>
      checkoutSchema.parse({
        customer: {
          fullName: "Ali Valiyev",
          phone: "+998901234567",
          address: "Toshkent shahri, Chilonzor tumani",
        },
        paymentMethod: "cash_on_delivery",
        total: 1,
        items: [
          {
            productId: "507f1f77bcf86cd799439011",
            quantity: 100,
          },
        ],
      })
    ).toThrow();
  });

  it("requires a published product image with truthful alt text", () => {
    expect(() =>
      productInputSchema.parse({
        ...validProductInput,
        status: "published",
        images: [
          {
            url: "https://images.pexels.com/photos/1234567/tulips.jpg",
            alt: "",
          },
        ],
      })
    ).toThrow();
  });

  it("accepts a valid quantity in the inclusive 1 through 99 range", () => {
    const parsed = checkoutSchema.parse({
      customer: {
        fullName: "Ali Valiyev",
        phone: "+998901234567",
        address: "Toshkent shahri, Chilonzor tumani",
      },
      paymentMethod: "card_on_delivery",
      items: [
        {
          productId: "507f1f77bcf86cd799439011",
          quantity: 99,
        },
      ],
    });

    expect(parsed.items[0]?.quantity).toBe(99);
  });

  it("rejects duplicate product lines so stock cannot be reserved twice ambiguously", () => {
    expect(() =>
      checkoutSchema.parse({
        customer: {
          fullName: "Ali Valiyev",
          phone: "+998901234567",
          address: "Toshkent shahri, Chilonzor tumani",
        },
        paymentMethod: "cash_on_delivery",
        items: [
          { productId: "507f1f77bcf86cd799439011", quantity: 1 },
          { productId: "507f1f77bcf86cd799439011", quantity: 2 },
        ],
      })
    ).toThrow(/only once/i);
  });

  it("normalizes valid product inputs and rejects unknown order statuses", () => {
    expect(productInputSchema.parse(validProductInput).slug).toBe(
      "pushti-lola-buketi"
    );
    expect(() => orderStatusSchema.parse("paid")).toThrow();
  });

  it("keeps public SEO settings bounded and requires a complete Open Graph image", () => {
    const settings = siteSettingsInputSchema.parse({
      siteName: "Nafis Flowers",
      siteDescription: "Toshkent bo'ylab nafis guldastalar.",
      deliveryFee: 25_000,
      workingHours: "08:00–22:00",
      seoTitle: "Nafis Flowers — Toshkentda gullar",
      seoDescription: "Yangi buketlar va tezkor yetkazib berish.",
      seoOgImage: {
        url: "https://res.cloudinary.com/nafis/image/upload/og.jpg",
        alt: "Nafis Flowers uchun pushti gullar kompozitsiyasi",
      },
    });

    expect(settings.seoOgImage?.url).toContain("res.cloudinary.com");
    expect(() =>
      siteSettingsInputSchema.parse({
        siteName: "Nafis Flowers",
        siteDescription: "Toshkent bo'ylab nafis guldastalar.",
        deliveryFee: 0,
        seoOgImage: { url: "https://example.com/og.jpg", alt: "" },
      })
    ).toThrow();
  });
});
