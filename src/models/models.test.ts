import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import { CategoryModel } from "./Category";
import { allowedOrderTransitions, OrderModel } from "./Order";
import { ProductModel } from "./Product";
import { HomeSectionModel } from "./HomeSection";
import { RateLimitModel } from "./RateLimit";
import { SiteSettingsModel } from "./SiteSettings";

const validProductDocument = {
  name: "Pushti lola buketi",
  slug: "pushti-lola-buketi",
  shortDescription: "Yangi lolalardan tuzilgan mayin kompozitsiya.",
  description: "Bayram va yaqin insonlar uchun nafis sovg‘a.",
  composition: ["Lola", "Yashil barglar"],
  categoryId: new Types.ObjectId(),
  price: 150_000,
  currency: "UZS",
  images: [
    {
      url: "https://images.pexels.com/photos/1234567/tulips.jpg",
      alt: "Pushti lolalardan tayyorlangan buket",
    },
  ],
  flowerTypes: ["tulip"],
  colors: ["pink"],
  stockQuantity: 12,
  isFeatured: false,
  isNewArrival: false,
  isOnSale: false,
  status: "published",
};

const localizedProductDocument = {
  ...validProductDocument,
  name: undefined,
  shortDescription: undefined,
  description: undefined,
  composition: undefined,
  translations: {
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
  },
};

describe("Mongoose model invariants", () => {
  it("requires all three localized site settings documents", async () => {
    const settings = new SiteSettingsModel({
      key: "default",
      siteName: "Floraluxe",
      translations: {
        ru: { siteDescription: "Авторские букеты в Ташкенте." },
        uz: { siteDescription: "Toshkentdagi mualliflik buketlari." },
      },
      deliveryFee: 0,
    });

    const validationError = await settings.validate().catch((error: unknown) => error);
    expect(validationError).toBeInstanceOf(Error);
    expect(
      (validationError as { errors?: Record<string, unknown> }).errors?.[
        "translations.en"
      ]
    ).toBeDefined();
  });

  it("requires all three localized product subdocuments", async () => {
    await expect(new ProductModel(localizedProductDocument).validate()).resolves.toBeUndefined();

    const missingEnglish = new ProductModel({
      ...localizedProductDocument,
      translations: {
        ru: localizedProductDocument.translations.ru,
        uz: localizedProductDocument.translations.uz,
      },
    });

    const validationError = await missingEnglish.validate().catch((error: unknown) => error);
    expect(validationError).toBeInstanceOf(Error);
    expect(
      (validationError as { errors?: Record<string, unknown> }).errors?.[
        "translations.en"
      ]
    ).toBeDefined();
  });

  it("rejects empty image alt text and negative stock before a database write", async () => {
    const product = new ProductModel({
      ...validProductDocument,
      stockQuantity: -1,
      images: [{ ...validProductDocument.images[0], alt: "" }],
    });

    const validationError = await product.validate().catch((error: unknown) => error);

    expect(validationError).toBeInstanceOf(Error);
    expect((validationError as { errors?: Record<string, unknown> }).errors?.["images.0.alt"]).toBeDefined();
    expect((validationError as { errors?: Record<string, unknown> }).errors?.stockQuantity).toBeDefined();
  });

  it("allows a published inquiry-only product but rejects its sale metadata", async () => {
    await expect(
      new ProductModel({
        ...localizedProductDocument,
        price: undefined,
        originalPrice: undefined,
        isOnSale: false,
      }).validate()
    ).resolves.toBeUndefined();

    const invalidSale = new ProductModel({
      ...localizedProductDocument,
      price: undefined,
      originalPrice: 200_000,
      isOnSale: true,
    });
    const validationError = await invalidSale.validate().catch((error: unknown) => error);

    expect(validationError).toBeInstanceOf(Error);
    expect((validationError as { errors?: Record<string, unknown> }).errors?.price).toBeDefined();
  });

  it("does not shadow Mongoose's internal isNew document lifecycle flag", () => {
    const product = new ProductModel(validProductDocument);

    expect(product.isNew).toBe(true);
    expect(product.get("isNewArrival")).toBe(false);
  });

  it("defaults missing seasons to all year and rejects ambiguous season sets", async () => {
    const defaulted = new ProductModel(localizedProductDocument);
    await expect(defaulted.validate()).resolves.toBeUndefined();
    expect(defaulted.get("seasons")).toEqual(["all_year"]);

    const ambiguous = new ProductModel({
      ...localizedProductDocument,
      seasons: ["all_year", "summer"],
    });
    const validationError = await ambiguous.validate().catch((error: unknown) => error);

    expect(validationError).toBeInstanceOf(Error);
    expect(
      (validationError as { errors?: Record<string, unknown> }).errors?.seasons
    ).toBeDefined();
  });

  it("declares the required catalog and singleton indexes", () => {
    const productIndexes = ProductModel.schema.indexes().map(([fields]) => fields);
    const categoryIndexes = CategoryModel.schema.indexes().map(([fields]) => fields);
    const settingIndexes = SiteSettingsModel.schema.indexes().map(([fields]) => fields);
    const rateLimitIndexes = RateLimitModel.schema.indexes();

    expect(productIndexes).toEqual(
      expect.arrayContaining([
        { slug: 1 },
        { status: 1, categoryId: 1 },
        { isOnSale: 1, status: 1 },
      ])
    );
    expect(categoryIndexes).toEqual(expect.arrayContaining([{ slug: 1 }]));
    expect(settingIndexes).toEqual(expect.arrayContaining([{ key: 1 }]));
    expect(rateLimitIndexes).toEqual(
      expect.arrayContaining([
        [
          { expiresAt: 1 },
          expect.objectContaining({ expireAfterSeconds: 0 }),
        ],
      ])
    );
  });

  it("only exposes the approved forward order transitions", () => {
    expect(allowedOrderTransitions).toEqual({
      pending: ["confirmed", "cancelled"],
      confirmed: ["preparing", "cancelled"],
      preparing: ["delivering", "cancelled"],
      delivering: ["delivered", "cancelled"],
      delivered: [],
      cancelled: [],
    });
  });

  it("rejects any order status outside the defined lifecycle", async () => {
    const order = new OrderModel({
      number: "FL-20260811-0001",
      locale: "ru",
      customer: {
        fullName: "Ali Valiyev",
        phone: "+998901234567",
        address: "Toshkent shahri, Chilonzor tumani",
      },
      items: [
        {
          productId: new Types.ObjectId(),
          slug: "pushti-lola-buketi",
          name: "Pushti lola buketi",
          imageUrl: "https://images.pexels.com/photos/1234567/tulips.jpg",
          unitPrice: 150_000,
          quantity: 1,
          lineTotal: 150_000,
        },
      ],
      subtotal: 150_000,
      deliveryFee: 0,
      total: 150_000,
      paymentMethod: "cash_on_delivery",
      paymentStatus: "unpaid",
      status: "invalid-status",
    });

    const validationError = await order.validate().catch((error: unknown) => error);

    expect(validationError).toBeInstanceOf(Error);
    expect((validationError as { errors?: Record<string, unknown> }).errors?.status).toBeDefined();
  });

  it("rejects an unsupported order locale", async () => {
    const order = new OrderModel({
      number: "FL-20260811-0002",
      locale: "de",
      customer: {
        fullName: "Ali Valiyev",
        phone: "+998901234567",
        address: "Toshkent shahri, Chilonzor tumani",
      },
      items: [
        {
          productId: new Types.ObjectId(),
          slug: "pushti-lola-buketi",
          name: "Pushti lola buketi",
          imageUrl: "https://images.pexels.com/photos/1234567/tulips.jpg",
          unitPrice: 150_000,
          quantity: 1,
          lineTotal: 150_000,
        },
      ],
      subtotal: 150_000,
      deliveryFee: 0,
      total: 150_000,
      paymentMethod: "cash_on_delivery",
      paymentStatus: "unpaid",
      status: "pending",
    });

    const validationError = await order.validate().catch((error: unknown) => error);
    expect((validationError as { errors?: Record<string, unknown> }).errors?.locale).toBeDefined();
  });

  it("rejects duplicate products and an inverted home-section schedule", async () => {
    const productId = new Types.ObjectId();
    const section = new HomeSectionModel({
      translations: {
        ru: { title: "Топ цветов" },
        uz: { title: "Top gullar" },
        en: { title: "Top flowers" },
      },
      productIds: [productId, productId],
      sortOrder: 0,
      status: "published",
      startsAt: new Date("2026-09-01T00:00:00.000Z"),
      endsAt: new Date("2026-08-01T00:00:00.000Z"),
    });

    const validationError = await section.validate().catch((error: unknown) => error);

    expect(validationError).toBeInstanceOf(Error);
    expect(
      (validationError as { errors?: Record<string, unknown> }).errors?.productIds
    ).toBeDefined();
    expect(
      (validationError as { errors?: Record<string, unknown> }).errors?.endsAt
    ).toBeDefined();
  });
});
