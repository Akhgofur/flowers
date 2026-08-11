import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORIES, PRODUCTS } from "../src/data/catalog";
import { dbConnect } from "../src/lib/mongodb";
import { CategoryModel, type CategoryDocument } from "../src/models/Category";
import { ProductModel, type ProductDocument } from "../src/models/Product";

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

export type CatalogSeedStore = {
  connect: () => Promise<unknown>;
  upsertCategory: (
    category: SeedCategory
  ) => Promise<{ id: string; created: boolean }>;
  upsertProduct: (product: SeedProduct) => Promise<{ created: boolean }>;
};

export type CatalogSeedSummary = {
  categories: { created: number; updated: number };
  products: { created: number; updated: number };
};

const seedStockQuantity = 20;

function toSeedCategory(index: number): SeedCategory {
  const category = CATEGORIES[index];
  if (!category) throw new Error(`Missing seed category at index ${index}.`);

  return {
    name: category.title,
    slug: category.id,
    image: {
      url: category.image,
      alt: `${category.title} uchun nafis gul kompozitsiyasi`,
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
    name: product.name,
    slug: product.id,
    shortDescription: product.shortDescription,
    description: `${product.shortDescription} Tarkibi: ${product.composition.join(
      ", "
    )}.`,
    composition: [...product.composition],
    categoryId,
    price: product.price,
    ...(product.originalPrice === undefined
      ? {}
      : { originalPrice: product.originalPrice }),
    currency: "UZS",
    images: [
      {
        url: product.image,
        alt: `${product.name} gul kompozitsiyasi`,
      },
    ],
    flowerTypes: [...product.flowerTypes],
    colors: [...product.colors],
    stockQuantity: seedStockQuantity,
    sortOrder: index,
    isFeatured: index < 4,
    isNewArrival: product.isNew,
    isOnSale: product.isOnSale,
    status: "published",
    deliveryEstimate: product.deliveryEstimate,
    size: product.size,
  };
}

function createMongoSeedStore(): CatalogSeedStore {
  return {
    connect: dbConnect,
    async upsertCategory(category) {
      const existed = await CategoryModel.exists({ slug: category.slug });
      const document = await CategoryModel.findOneAndUpdate(
        { slug: category.slug },
        { $set: category },
        { new: true, upsert: true, setDefaultsOnInsert: true }
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
        { new: true, upsert: true, setDefaultsOnInsert: true }
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
  const summary = await seedCatalog();
  console.info(
    `Catalog seed complete: ${summary.categories.created} categories created, ${summary.categories.updated} updated; ${summary.products.created} products created, ${summary.products.updated} updated.`
  );
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
