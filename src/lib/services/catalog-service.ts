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
  findPublishedProductsByIds,
  findPublishedSitemapEntries,
} from "@/lib/repositories/catalog-repository";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 200;

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
  return products.filter((product) => product.status === "published");
}

export const CATALOG_PAGE_LIMIT = MAX_LIMIT;

/** Safety valve: 20 pages is far beyond any real catalog, but bounds the loop. */
const MAX_CATALOG_PAGES = 20;

export type EntirePublishedCatalog = {
  products: CatalogProduct[];
  /** True when the catalog outgrew the page budget, so callers know it is partial. */
  truncated: boolean;
};

/**
 * Reads every published product rather than a single capped page. Callers that
 * filter or reconcile client state need the whole catalog; a silent cut-off used
 * to drop products from search and cart lines from checkout as the catalog grew.
 */
export async function getEntirePublishedCatalog(
  locale: Locale
): Promise<EntirePublishedCatalog> {
  const byId = new Map<string, CatalogProduct>();

  for (let page = 1; page <= MAX_CATALOG_PAGES; page += 1) {
    const batch = await getPublishedCatalog(locale, {
      page,
      limit: CATALOG_PAGE_LIMIT,
    });

    for (const product of batch) byId.set(product.id, product);

    if (batch.length < CATALOG_PAGE_LIMIT) {
      return { products: [...byId.values()], truncated: false };
    }
  }

  return { products: [...byId.values()], truncated: true };
}

/**
 * Reads an arbitrary set of products by id. The browser cart names products the
 * current page never rendered, so it needs a lookup that is neither paged nor
 * filtered. Deliberately uncached: the id set varies per basket, and caching it
 * would grow a cache key per distinct combination.
 */
export async function getPublishedProductsByIds(
  locale: Locale,
  productIds: readonly string[]
): Promise<CatalogProduct[]> {
  const uniqueIds = [...new Set(productIds)];
  if (uniqueIds.length === 0) return [];

  const products = await findPublishedProductsByIds(locale, uniqueIds);
  return products.filter((product) => product.status === "published");
}

export async function getPublishedProductBySlug(
  locale: Locale,
  slug: string
): Promise<CatalogProduct | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return null;

  const product = await readPublishedProduct(locale, normalizedSlug);
  return product?.status === "published" ? product : null;
}

export async function getPublishedCategories(locale: Locale): Promise<CatalogCategory[]> {
  const categories = await readPublishedCategories(locale);
  return categories.filter((category) => category.status === "published");
}

export async function getPublishedSitemapEntries(): Promise<PublicSitemapEntries> {
  return readPublishedSitemapEntries();
}
