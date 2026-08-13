import "server-only";
import type { PipelineStage, QueryFilter, Types } from "mongoose";
import type {
  CatalogCategory,
  CatalogProduct,
  NormalizedPublicCatalogFilters,
  PublicSitemapEntries,
  ProductImage,
} from "@/lib/contracts";
import { LOCALES, type Locale } from "@/i18n/config";
import {
  resolveCategoryTranslation,
  resolveProductTranslation,
} from "@/lib/locale-content";
import { dbConnect } from "@/lib/mongodb";
import { CategoryModel, type CategoryDocument } from "@/models/Category";
import { ProductModel, type ProductDocument } from "@/models/Product";
import { OrderModel } from "@/models/Order";

type PopulatedCategory = Pick<CategoryDocument, "slug">;
type PublicProductRecord = Omit<ProductDocument, "categoryId"> & {
  _id: Types.ObjectId;
  categoryId: PopulatedCategory | Types.ObjectId | null;
};
type PublicCategoryRecord = CategoryDocument & { _id: Types.ObjectId };
export type RecommendationCandidate = {
  product: CatalogProduct;
  updatedAt: string;
};

const publishedProductFilter: QueryFilter<ProductDocument> = {
  status: "published",
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
  document: PublicProductRecord,
  locale: Locale
): CatalogProduct | null {
  if (document.status !== "published" || !isPopulatedCategory(document.categoryId)) {
    return null;
  }

  const translation = resolveProductTranslation(document, locale);
  if (!translation) return null;

  return {
    id: document._id.toString(),
    name: translation.name,
    slug: document.slug,
    shortDescription: translation.shortDescription,
    description: translation.description,
    composition: [...translation.composition],
    ...(document.price === undefined ? {} : { price: document.price }),
    ...(document.originalPrice === undefined
      ? {}
      : { originalPrice: document.originalPrice }),
    currency: "UZS",
    images: document.images.map(serializeImage),
    categorySlug: document.categoryId.slug,
    flowerTypes: [...document.flowerTypes],
    colors: [...document.colors],
    seasons: document.seasons?.length > 0 ? [...document.seasons] : ["all_year"],
    sortOrder: document.sortOrder,
    isFeatured: document.isFeatured,
    isNew: document.isNewArrival,
    isOnSale: document.isOnSale,
    ...(translation.deliveryEstimate === undefined
      ? {}
      : { deliveryEstimate: translation.deliveryEstimate }),
    ...(translation.size === undefined ? {} : { size: translation.size }),
    status: "published",
    ...(translation.seoTitle === undefined ? {} : { seoTitle: translation.seoTitle }),
    ...(translation.seoDescription === undefined
      ? {}
      : { seoDescription: translation.seoDescription }),
  };
}

function toCatalogCategory(
  document: PublicCategoryRecord,
  locale: Locale
): CatalogCategory | null {
  const translation = resolveCategoryTranslation(document, locale);
  if (!translation) return null;

  return {
    id: document._id.toString(),
    name: translation.name,
    slug: document.slug,
    ...(translation.description === undefined
      ? {}
      : { description: translation.description }),
    ...(document.image === undefined ? {} : { image: serializeImage(document.image) }),
    order: document.order,
    status: "published",
  };
}

/**
 * `categoryScope` is one published category, or every published category when
 * the shopper asked for no particular one. Scoping here rather than after the
 * query matters: products in a hidden category used to fill the page budget and
 * only then be dropped, so a page of 48 could return 32 and the tail of the
 * catalogue never surfaced at all.
 */
export function buildPublishedProductQuery(
  filters: NormalizedPublicCatalogFilters,
  categoryScope: Types.ObjectId | readonly Types.ObjectId[]
): QueryFilter<ProductDocument> {
  const query: QueryFilter<ProductDocument> = { ...publishedProductFilter };

  if (filters.sale) query.isOnSale = true;
  query.categoryId = Array.isArray(categoryScope)
    ? { $in: [...categoryScope] }
    : (categoryScope as Types.ObjectId);

  if (filters.query) {
    const searchExpression = new RegExp(escapeRegex(filters.query), "i");
    query.$or = LOCALES.flatMap((locale) => [
      { [`translations.${locale}.name`]: searchExpression },
      { [`translations.${locale}.shortDescription`]: searchExpression },
      { [`translations.${locale}.description`]: searchExpression },
      { [`translations.${locale}.composition`]: searchExpression },
    ]) as QueryFilter<ProductDocument>[];
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

async function findPublishedCategoryIds(): Promise<Types.ObjectId[]> {
  const categories = await CategoryModel.find({ status: "published" })
    .select({ _id: 1 })
    .lean()
    .exec();

  return categories.map((category) => category._id);
}

export async function findPublishedCatalogProducts(
  locale: Locale,
  filters: NormalizedPublicCatalogFilters
): Promise<CatalogProduct[]> {
  await dbConnect();

  const categoryId = await resolvePublishedCategoryId(filters.category);
  if (categoryId === null) return [];

  const categoryScope = categoryId ?? (await findPublishedCategoryIds());
  if (Array.isArray(categoryScope) && categoryScope.length === 0) return [];

  const documents = (await ProductModel.find(
    buildPublishedProductQuery(filters, categoryScope)
  )
    .populate({
      path: "categoryId",
      match: { status: "published" },
      select: { slug: 1 },
    })
    .sort({
      isFeatured: -1,
      isOnSale: -1,
      sortOrder: 1,
      [`translations.${locale}.name`]: 1,
      _id: 1,
    })
    .skip((filters.page - 1) * filters.limit)
    .limit(filters.limit)
    .lean()
    .exec()) as unknown as PublicProductRecord[];

  return documents
    .map((document) => toCatalogProduct(document, locale))
    .filter((product): product is CatalogProduct => product !== null);
}

export async function findPublishedProductBySlug(
  locale: Locale,
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

  return document ? toCatalogProduct(document, locale) : null;
}

export function buildBestSellerAggregation(): PipelineStage[] {
  return [
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
  ];
}

export async function findBestSellerProductIds(): Promise<string[]> {
  await dbConnect();
  const rows = (await OrderModel.aggregate(buildBestSellerAggregation()).exec()) as Array<{
    productId: string;
  }>;
  return rows.map((row) => row.productId);
}

export async function findPublishedProductsByIds(
  locale: Locale,
  productIds: readonly string[]
): Promise<CatalogProduct[]> {
  if (productIds.length === 0) return [];
  await dbConnect();

  const documents = (await ProductModel.find({
    ...publishedProductFilter,
    _id: { $in: productIds },
  })
    .populate({
      path: "categoryId",
      match: { status: "published" },
      select: { slug: 1 },
    })
    .lean()
    .exec()) as unknown as PublicProductRecord[];

  return documents
    .map((document) => toCatalogProduct(document, locale))
    .filter((product): product is CatalogProduct => product !== null);
}

export async function findRecommendationCandidates(
  locale: Locale
): Promise<RecommendationCandidate[]> {
  await dbConnect();
  const documents = (await ProductModel.find(publishedProductFilter)
    .populate({
      path: "categoryId",
      match: { status: "published" },
      select: { slug: 1 },
    })
    .sort({ isFeatured: -1, sortOrder: 1, updatedAt: -1, _id: 1 })
    .lean()
    .exec()) as unknown as PublicProductRecord[];

  return documents.flatMap((document) => {
    const product = toCatalogProduct(document, locale);
    return product
      ? [{ product, updatedAt: document.updatedAt.toISOString() }]
      : [];
  });
}

export async function findPublishedCategories(locale: Locale): Promise<CatalogCategory[]> {
  await dbConnect();

  const documents = (await CategoryModel.find({ status: "published" })
    .sort({ order: 1, [`translations.${locale}.name`]: 1, _id: 1 })
    .lean()
    .exec()) as unknown as PublicCategoryRecord[];

  return documents
    .filter((document) => document.status === "published")
    .map((document) => toCatalogCategory(document, locale))
    .filter((category): category is CatalogCategory => category !== null);
}

/** A compact, public-only projection used by sitemap generation. */
export async function findPublishedSitemapEntries(): Promise<PublicSitemapEntries> {
  await dbConnect();

  const categoryDocuments = (await CategoryModel.find({ status: "published" })
    .select({ slug: 1, updatedAt: 1 })
    .sort({ order: 1, slug: 1, _id: 1 })
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
