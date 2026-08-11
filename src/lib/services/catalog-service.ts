import type {
  CatalogCategory,
  CatalogProduct,
  NormalizedPublicCatalogFilters,
  PublicCatalogFilters,
  PublicSitemapEntries,
} from "@/lib/contracts";
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
  async (filters: NormalizedPublicCatalogFilters) =>
    findPublishedCatalogProducts(filters),
  ["published-catalog"]
);

const readPublishedProduct = cacheCatalogReader(
  async (slug: string) => findPublishedProductBySlug(slug),
  ["published-product"]
);

const readPublishedCategories = cacheCatalogReader(
  async () => findPublishedCategories(),
  ["published-categories"]
);

const readPublishedSitemapEntries = cacheCatalogReader(
  async () => findPublishedSitemapEntries(),
  ["published-sitemap"]
);

export async function getPublishedCatalog(
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

  const products = await readPublishedCatalog(normalizedFilters);
  return products.filter(
    (product) => product.status === "published" && product.stockQuantity > 0
  );
}

export async function getPublishedProductBySlug(
  slug: string
): Promise<CatalogProduct | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return null;

  const product = await readPublishedProduct(normalizedSlug);
  return product?.status === "published" && product.stockQuantity > 0
    ? product
    : null;
}

export async function getPublishedCategories(): Promise<CatalogCategory[]> {
  const categories = await readPublishedCategories();
  return categories.filter((category) => category.status === "published");
}

export async function getPublishedSitemapEntries(): Promise<PublicSitemapEntries> {
  return readPublishedSitemapEntries();
}
