import { unstable_cache } from "next/cache";

export const CATALOG_CACHE_TAGS = {
  all: "catalog",
  products: "catalog:products",
  categories: "catalog:categories",
} as const;

export const CATALOG_REVALIDATE_SECONDS = 60;
export const SITE_SETTINGS_CACHE_TAG = "site-settings";

type AsyncReader<Arguments extends readonly unknown[], Result> = (
  ...arguments_: Arguments
) => Promise<Result>;

/**
 * Keeps the cache policy in one module so admin writes can invalidate the same
 * tag set. Vitest receives the raw reader to keep repository tests deterministic.
 */
export function cacheCatalogReader<Arguments extends readonly unknown[], Result>(
  reader: AsyncReader<Arguments, Result>,
  keyParts: string[]
): AsyncReader<Arguments, Result> {
  if (process.env.NODE_ENV === "test") return reader;

  return unstable_cache(reader, keyParts, {
    revalidate: CATALOG_REVALIDATE_SECONDS,
    tags: Object.values(CATALOG_CACHE_TAGS),
  }) as AsyncReader<Arguments, Result>;
}

export function cacheSiteSettingsReader<Result>(reader: () => Promise<Result>): () => Promise<Result> {
  if (process.env.NODE_ENV === "test") return reader;

  return unstable_cache(reader, ["public-site-settings"], {
    revalidate: CATALOG_REVALIDATE_SECONDS,
    tags: [SITE_SETTINGS_CACHE_TAG],
  }) as () => Promise<Result>;
}
