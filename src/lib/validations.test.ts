import { describe, expect, it } from "vitest";
import {
  checkoutSchema,
  orderStatusSchema,
  productPatchInputSchema,
  productInputSchema,
  siteSettingsInputSchema,
} from "./validations";

const productTranslations = {
  ru: {
    name: "Букет алых роз",
    shortDescription: "Бархатные розы для важных признаний.",
    description: "Авторский букет из свежих алых роз.",
    composition: ["25 алых роз", "Эвкалипт"],
  },
  uz: {
    name: "Qirmizi atirgul buketi",
    shortDescription: "Muhim izhorlar uchun baxmaldek atirgullar.",
    description: "Yangi qirmizi atirgullardan mualliflik buketi.",
    composition: ["25 ta qirmizi atirgul", "Evkalipt"],
  },
  en: {
    name: "Scarlet rose bouquet",
    shortDescription: "Velvet roses for meaningful declarations.",
    description: "A signature bouquet of fresh scarlet roses.",
    composition: ["25 scarlet roses", "Eucalyptus"],
  },
};

const validProductInput = {
  slug: "pushti-lola-buketi",
  translations: productTranslations,
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
  it("requires complete Russian, Uzbek and English product content", () => {
    expect(
      productInputSchema.parse({
        ...validProductInput,
        translations: productTranslations,
      }).translations.en.name
    ).toBe("Scarlet rose bouquet");

    expect(() =>
      productInputSchema.parse({
        ...validProductInput,
        translations: { ru: productTranslations.ru, uz: productTranslations.uz },
      })
    ).toThrow();
  });

  it("rejects a browser-supplied order total and quantity above 99", () => {
    expect(() =>
      checkoutSchema.parse({
        locale: "ru",
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
      locale: "uz",
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
        locale: "ru",
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
    const product = productInputSchema.parse(validProductInput);

    expect(product.slug).toBe("pushti-lola-buketi");
    expect(product.seasons).toEqual(["all_year"]);
    expect(() => orderStatusSchema.parse("paid")).toThrow();
  });

  it("accepts named seasons but rejects empty, duplicate, and mixed all-year seasons", () => {
    expect(
      productInputSchema.parse({ ...validProductInput, seasons: ["spring", "summer"] })
        .seasons
    ).toEqual(["spring", "summer"]);
    expect(() => productInputSchema.parse({ ...validProductInput, seasons: [] })).toThrow();
    expect(() =>
      productInputSchema.parse({ ...validProductInput, seasons: ["summer", "summer"] })
    ).toThrow(/unique/i);
    expect(() =>
      productInputSchema.parse({ ...validProductInput, seasons: ["all_year", "summer"] })
    ).toThrow(/all_year/i);
  });

  it("accepts an inquiry-only product with no price", () => {
    const parsed = productInputSchema.parse({
      ...validProductInput,
      price: undefined,
    });

    expect(parsed.price).toBeUndefined();
    expect(parsed.originalPrice).toBeUndefined();
    expect(parsed.isOnSale).toBe(false);
  });

  it("rejects sale pricing for an inquiry-only product", () => {
    expect(() =>
      productInputSchema.parse({
        ...validProductInput,
        price: undefined,
        originalPrice: 200_000,
        isOnSale: true,
      })
    ).toThrow(/price/i);
  });

  it("accepts a minimal product patch but rejects empty and unknown patches", () => {
    expect(productPatchInputSchema.parse({ price: null })).toEqual({ price: null });
    expect(productPatchInputSchema.parse({ seasons: ["winter"] })).toEqual({
      seasons: ["winter"],
    });
    expect(() => productPatchInputSchema.parse({})).toThrow(/required/i);
    expect(() => productPatchInputSchema.parse({ price: 100_000, images: [] })).toThrow();
  });

  it("accepts only the three supported checkout locales", () => {
    const input = {
      locale: "ru",
      customer: {
        fullName: "Ali Valiyev",
        phone: "+998901234567",
        address: "Toshkent shahri, Chilonzor tumani",
      },
      paymentMethod: "cash_on_delivery",
      items: [{ productId: "507f1f77bcf86cd799439011", quantity: 1 }],
    };

    expect(checkoutSchema.parse(input).locale).toBe("ru");
    expect(() => checkoutSchema.parse({ ...input, locale: "de" })).toThrow();
  });

  it("keeps public SEO settings bounded and requires a complete Open Graph image", () => {
    const settings = siteSettingsInputSchema.parse({
      siteName: "Nafis Flowers",
      translations: {
        ru: {
          siteDescription: "Авторские букеты в Ташкенте.",
          seoTitle: "Nafis Flowers — доставка цветов",
          seoDescription: "Свежие букеты и бережная доставка.",
        },
        uz: {
          siteDescription: "Toshkent bo'ylab nafis guldastalar.",
          seoTitle: "Nafis Flowers — Toshkentda gullar",
          seoDescription: "Yangi buketlar va tezkor yetkazib berish.",
        },
        en: {
          siteDescription: "Signature bouquets in Tashkent.",
          seoTitle: "Nafis Flowers — flower delivery",
          seoDescription: "Fresh bouquets and thoughtful delivery.",
        },
      },
      deliveryFee: 25_000,
      workingHours: "08:00–22:00",
      seoOgImage: {
        url: "https://res.cloudinary.com/nafis/image/upload/og.jpg",
        alt: "Nafis Flowers uchun pushti gullar kompozitsiyasi",
      },
    });

    expect(settings.seoOgImage?.url).toContain("res.cloudinary.com");
    expect(() =>
      siteSettingsInputSchema.parse({
        siteName: "Nafis Flowers",
        translations: {
          ru: { siteDescription: "Авторские букеты в Ташкенте." },
          uz: { siteDescription: "Toshkent bo'ylab nafis guldastalar." },
          en: { siteDescription: "Signature bouquets in Tashkent." },
        },
        deliveryFee: 0,
        seoOgImage: { url: "https://example.com/og.jpg", alt: "" },
      })
    ).toThrow();
  });
});
