import "server-only";
import type { QueryFilter, Types } from "mongoose";
import type {
  CatalogCategory,
  CatalogProduct,
  NormalizedPublicCatalogFilters,
  PublicSitemapEntries,
  ProductImage,
} from "@/lib/contracts";
import { dbConnect } from "@/lib/mongodb";
import { CategoryModel, type CategoryDocument } from "@/models/Category";
import { ProductModel, type ProductDocument } from "@/models/Product";

type PopulatedCategory = Pick<CategoryDocument, "slug">;
type PublicProductRecord = Omit<ProductDocument, "categoryId"> & {
  _id: Types.ObjectId;
  categoryId: PopulatedCategory | Types.ObjectId | null;
};
type PublicCategoryRecord = CategoryDocument & { _id: Types.ObjectId };

const publishedProductFilter: QueryFilter<ProductDocument> = {
  status: "published",
  stockQuantity: { $gt: 0 },
};

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isPopulatedCategory(value: unknown): value is PopulatedCategory {
  return (
    typeof value === "object" &&
    value !== null &&
    "slug" in value &&
    typeof (value as { slug?: unknown }).slug === "string"
  );
}

function serializeImage(image: ProductImage): ProductImage {
  return image.publicId
    ? { url: image.url, alt: image.alt, publicId: image.publicId }
    : { url: image.url, alt: image.alt };
}

export function toCatalogProduct(
  document: PublicProductRecord
): CatalogProduct | null {
  if (document.status !== "published" || !isPopulatedCategory(document.categoryId)) {
    return null;
  }

  return {
    id: document._id.toString(),
    name: document.name,
    slug: document.slug,
    shortDescription: document.shortDescription,
    description: document.description,
    composition: [...document.composition],
    price: document.price,
    ...(document.originalPrice === undefined
      ? {}
      : { originalPrice: document.originalPrice }),
    currency: "UZS",
    images: document.images.map(serializeImage),
    categorySlug: document.categoryId.slug,
    flowerTypes: [...document.flowerTypes],
    colors: [...document.colors],
    stockQuantity: document.stockQuantity,
    sortOrder: document.sortOrder,
    isFeatured: document.isFeatured,
    isNew: document.isNewArrival,
    isOnSale: document.isOnSale,
    ...(document.deliveryEstimate === undefined
      ? {}
      : { deliveryEstimate: document.deliveryEstimate }),
    ...(document.size === undefined ? {} : { size: document.size }),
    status: "published",
    ...(document.seoTitle === undefined ? {} : { seoTitle: document.seoTitle }),
    ...(document.seoDescription === undefined
      ? {}
      : { seoDescription: document.seoDescription }),
  };
}

function toCatalogCategory(document: PublicCategoryRecord): CatalogCategory {
  return {
    id: document._id.toString(),
    name: document.name,
    slug: document.slug,
    ...(document.description === undefined
      ? {}
      : { description: document.description }),
    ...(document.image === undefined ? {} : { image: serializeImage(document.image) }),
    order: document.order,
    status: "published",
  };
}

function buildPublishedProductQuery(
  filters: NormalizedPublicCatalogFilters,
  categoryId?: Types.ObjectId
): QueryFilter<ProductDocument> {
  const query: QueryFilter<ProductDocument> = { ...publishedProductFilter };

  if (filters.sale) query.isOnSale = true;
  if (categoryId) query.categoryId = categoryId;

  if (filters.query) {
    const searchExpression = new RegExp(escapeRegex(filters.query), "i");
    query.$or = [
      { name: searchExpression },
      { shortDescription: searchExpression },
      { description: searchExpression },
      { composition: searchExpression },
    ];
  }

  return query;
}

async function resolvePublishedCategoryId(
  categorySlug: string | undefined
): Promise<Types.ObjectId | undefined | null> {
  if (!categorySlug) return undefined;

  const category = await CategoryModel.findOne({
    slug: categorySlug,
    status: "published",
  })
    .select({ _id: 1 })
    .lean()
    .exec();

  return category?._id ?? null;
}

export async function findPublishedCatalogProducts(
  filters: NormalizedPublicCatalogFilters
): Promise<CatalogProduct[]> {
  await dbConnect();

  const categoryId = await resolvePublishedCategoryId(filters.category);
  if (categoryId === null) return [];

  const documents = (await ProductModel.find(
    buildPublishedProductQuery(filters, categoryId)
  )
    .populate({
      path: "categoryId",
      match: { status: "published" },
      select: { slug: 1 },
    })
    .sort({ isFeatured: -1, isOnSale: -1, sortOrder: 1, name: 1, _id: 1 })
    .skip((filters.page - 1) * filters.limit)
    .limit(filters.limit)
    .lean()
    .exec()) as unknown as PublicProductRecord[];

  return documents
    .map(toCatalogProduct)
    .filter((product): product is CatalogProduct => product !== null);
}

export async function findPublishedProductBySlug(
  slug: string
): Promise<CatalogProduct | null> {
  await dbConnect();

  const document = (await ProductModel.findOne({
    ...publishedProductFilter,
    slug,
  })
    .populate({
      path: "categoryId",
      match: { status: "published" },
      select: { slug: 1 },
    })
    .lean()
    .exec()) as unknown as PublicProductRecord | null;

  return document ? toCatalogProduct(document) : null;
}

export async function findPublishedCategories(): Promise<CatalogCategory[]> {
  await dbConnect();

  const documents = (await CategoryModel.find({ status: "published" })
    .sort({ order: 1, name: 1, _id: 1 })
    .lean()
    .exec()) as unknown as PublicCategoryRecord[];

  return documents
    .filter((document) => document.status === "published")
    .map(toCatalogCategory);
}

/** A compact, public-only projection used by sitemap generation. */
export async function findPublishedSitemapEntries(): Promise<PublicSitemapEntries> {
  await dbConnect();

  const categoryDocuments = (await CategoryModel.find({ status: "published" })
    .select({ slug: 1, updatedAt: 1 })
    .sort({ order: 1, name: 1, _id: 1 })
    .lean()
    .exec()) as unknown as PublicCategoryRecord[];

  const categoryIds = categoryDocuments.map((category) => category._id);
  const productDocuments =
    categoryIds.length === 0
      ? []
      : ((await ProductModel.find({
          ...publishedProductFilter,
          categoryId: { $in: categoryIds },
        })
          .select({ slug: 1, updatedAt: 1 })
          .sort({ updatedAt: -1, _id: 1 })
          .lean()
          .exec()) as unknown as Array<
          Pick<ProductDocument, "slug" | "updatedAt"> & { _id: Types.ObjectId }
        >);

  return {
    products: productDocuments.map((product) => ({
      slug: product.slug,
      updatedAt: product.updatedAt,
    })),
    categories: categoryDocuments.map((category) => ({
      slug: category.slug,
      updatedAt: category.updatedAt,
    })),
  };
}
