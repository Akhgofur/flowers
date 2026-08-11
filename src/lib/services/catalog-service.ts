import type {
  CatalogCategory,
  CatalogProduct,
  NormalizedPublicCatalogFilters,
  PublicCatalogFilters,
  PublicSitemapEntries,
} from "@/lib/contracts";
import type { Locale } from "@/i18n/config";
import { cacheCatalogReader } from "@/lib/cache";
import {
  findPublishedCatalogProducts,
  findPublishedCategories,
  findPublishedProductBySlug,
  findPublishedSitemapEntries,
} from "@/lib/repositories/catalog-repository";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 48;

export function normalizePublicCatalogFilters(
  filters: PublicCatalogFilters
): NormalizedPublicCatalogFilters {
  const category = filters.category?.trim();
  const query = filters.query?.trim();

  return {
    category: category || undefined,
    sale: filters.sale === true,
    query: query || undefined,
    page: filters.page ?? 1,
    limit: filters.limit ?? DEFAULT_LIMIT,
  };
}

const readPublishedCatalog = cacheCatalogReader(
  async (locale: Locale, filters: NormalizedPublicCatalogFilters) =>
    findPublishedCatalogProducts(locale, filters),
  ["published-catalog"]
);

const readPublishedProduct = cacheCatalogReader(
  async (locale: Locale, slug: string) => findPublishedProductBySlug(locale, slug),
  ["published-product"]
);

const readPublishedCategories = cacheCatalogReader(
  async (locale: Locale) => findPublishedCategories(locale),
  ["published-categories"]
);

const readPublishedSitemapEntries = cacheCatalogReader(
  async () => findPublishedSitemapEntries(),
  ["published-sitemap"]
);

export async function getPublishedCatalog(
  locale: Locale,
  filters: PublicCatalogFilters
): Promise<CatalogProduct[]> {
  const normalizedFilters = normalizePublicCatalogFilters(filters);

  if (
    !Number.isInteger(normalizedFilters.page) ||
    normalizedFilters.page < 1 ||
    !Number.isInteger(normalizedFilters.limit) ||
    normalizedFilters.limit < 1 ||
    normalizedFilters.limit > MAX_LIMIT
  ) {
    throw new Error("Invalid public catalog pagination.");
  }

  const products = await readPublishedCatalog(locale, normalizedFilters);
  return products.filter(
    (product) => product.status === "published" && product.stockQuantity > 0
  );
}

export async function getPublishedProductBySlug(
  locale: Locale,
  slug: string
): Promise<CatalogProduct | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return null;

  const product = await readPublishedProduct(locale, normalizedSlug);
  return product?.status === "published" && product.stockQuantity > 0
    ? product
    : null;
}

export async function getPublishedCategories(locale: Locale): Promise<CatalogCategory[]> {
  const categories = await readPublishedCategories(locale);
  return categories.filter((category) => category.status === "published");
}

export async function getPublishedSitemapEntries(): Promise<PublicSitemapEntries> {
  return readPublishedSitemapEntries();
}
