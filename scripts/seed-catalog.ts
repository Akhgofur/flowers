import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import mongoose from "mongoose";
import { CATEGORIES, PRODUCTS } from "../src/data/catalog";
import { dbConnect } from "../src/lib/mongodb";
import { CategoryModel, type CategoryDocument } from "../src/models/Category";
import { ProductModel, type ProductDocument } from "../src/models/Product";
import { SiteSettingsModel, type SiteSettingsDocument } from "../src/models/SiteSettings";

export type SeedCategory = Omit<
  CategoryDocument,
  "createdAt" | "updatedAt"
>;
export type SeedProduct = Omit<
  ProductDocument,
  "categoryId" | "createdAt" | "updatedAt"
> & {
  categoryId: string;
};
export type SeedSiteSettings = Omit<SiteSettingsDocument, "createdAt" | "updatedAt">;

export type CatalogSeedStore = {
  connect: () => Promise<unknown>;
  upsertCategory: (
    category: SeedCategory
  ) => Promise<{ id: string; created: boolean }>;
  upsertProduct: (product: SeedProduct) => Promise<{ created: boolean }>;
  seedSettingsIfMissing: (settings: SeedSiteSettings) => Promise<void>;
};

export type CatalogSeedSummary = {
  categories: { created: number; updated: number };
  products: { created: number; updated: number };
};

const DEFAULT_SEED_SETTINGS: SeedSiteSettings = {
  key: "default",
  siteName: "Floraluxe",
  translations: {
    ru: {
      siteDescription: "Авторские букеты и бережная доставка цветов по Ташкенту.",
      deliveryPolicy: "Доставка по Ташкенту, время подтверждает оператор.",
    },
    uz: {
      siteDescription: "Toshkent bo‘ylab mualliflik buketlari va ehtiyotkor yetkazib berish.",
      deliveryPolicy: "Toshkent bo‘ylab yetkazamiz, vaqtni operator tasdiqlaydi.",
    },
    en: {
      siteDescription: "Signature bouquets and thoughtful flower delivery across Tashkent.",
      deliveryPolicy: "Delivery across Tashkent; timing is confirmed by our operator.",
    },
  },
  phone: "+998 88 780 22 08",
  address: "Yunusobod, Toshkent",
  workingHours: "08:00–22:00",
  deliveryFee: 0,
};

function toSeedCategory(index: number): SeedCategory {
  const category = CATEGORIES[index];
  if (!category) throw new Error(`Missing seed category at index ${index}.`);

  return {
    slug: category.id,
    translations: {
      ru: { ...category.translations.ru },
      uz: { ...category.translations.uz },
      en: { ...category.translations.en },
    },
    image: {
      url: category.image,
      alt: category.translations.ru.name,
    },
    order: index,
    status: "published",
  };
}

function toSeedProduct(
  index: number,
  categoryId: string
): SeedProduct {
  const product = PRODUCTS[index];
  if (!product) throw new Error(`Missing seed product at index ${index}.`);

  return {
    slug: product.id,
    translations: {
      ru: { ...product.translations.ru, composition: [...product.translations.ru.composition] },
      uz: { ...product.translations.uz, composition: [...product.translations.uz.composition] },
      en: { ...product.translations.en, composition: [...product.translations.en.composition] },
    },
    categoryId,
    price: product.price,
    ...(product.originalPrice === undefined
      ? {}
      : { originalPrice: product.originalPrice }),
    currency: "UZS",
    images: [
      {
        url: product.image,
        alt: product.translations.ru.name,
      },
    ],
    flowerTypes: [...product.flowerTypes],
    colors: [...product.colors],
    seasons: ["all_year"],
    sortOrder: index,
    isFeatured: index < 4,
    isNewArrival: product.isNew,
    isOnSale: product.isOnSale,
    status: "published",
  };
}

function createMongoSeedStore(): CatalogSeedStore {
  return {
    connect: dbConnect,
    async seedSettingsIfMissing(settings) {
      await SiteSettingsModel.updateOne(
        { key: "default" },
        { $setOnInsert: settings },
        { upsert: true, setDefaultsOnInsert: true }
      ).exec();
    },
    async upsertCategory(category) {
      const existed = await CategoryModel.exists({ slug: category.slug });
      const document = await CategoryModel.findOneAndUpdate(
        { slug: category.slug },
        { $set: category },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
      )
        .select({ _id: 1 })
        .exec();

      if (!document) {
        throw new Error(`Unable to upsert category ${category.slug}.`);
      }

      return { id: document._id.toString(), created: !existed };
    },
    async upsertProduct(product) {
      const existed = await ProductModel.exists({ slug: product.slug });
      await ProductModel.findOneAndUpdate(
        { slug: product.slug },
        { $set: product },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
      ).exec();

      return { created: !existed };
    },
  };
}

function increment(summary: { created: number; updated: number }, created: boolean) {
  if (created) summary.created += 1;
  else summary.updated += 1;
}

export async function seedCatalog(
  store: CatalogSeedStore = createMongoSeedStore()
): Promise<CatalogSeedSummary> {
  await store.connect();
  await store.seedSettingsIfMissing(DEFAULT_SEED_SETTINGS);

  const summary: CatalogSeedSummary = {
    categories: { created: 0, updated: 0 },
    products: { created: 0, updated: 0 },
  };
  const categoryIds = new Map<string, string>();

  for (let index = 0; index < CATEGORIES.length; index += 1) {
    const category = toSeedCategory(index);
    const result = await store.upsertCategory(category);
    categoryIds.set(category.slug, result.id);
    increment(summary.categories, result.created);
  }

  for (let index = 0; index < PRODUCTS.length; index += 1) {
    const sourceProduct = PRODUCTS[index];
    if (!sourceProduct) throw new Error(`Missing seed product at index ${index}.`);

    const categoryId = categoryIds.get(sourceProduct.category);
    if (!categoryId) {
      throw new Error(`Missing category seed for ${sourceProduct.category}.`);
    }

    const result = await store.upsertProduct(toSeedProduct(index, categoryId));
    increment(summary.products, result.created);
  }

  return summary;
}

async function runCli() {
  const projectDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    ".."
  );
  nextEnv.loadEnvConfig(
    projectDirectory,
    process.env.NODE_ENV !== "production"
  );

  try {
    const summary = await seedCatalog();
    console.info(
      `Catalog seed complete: ${summary.categories.created} categories created, ${summary.categories.updated} updated; ${summary.products.created} products created, ${summary.products.updated} updated.`
    );
  } finally {
    await mongoose.disconnect();
  }
}

const invokedScript = process.argv[1];
if (
  invokedScript &&
  path.resolve(invokedScript) === path.resolve(fileURLToPath(import.meta.url))
) {
  void runCli().catch(() => {
    console.error("Catalog seed failed. Check database configuration and connectivity.");
    process.exitCode = 1;
  });
}
