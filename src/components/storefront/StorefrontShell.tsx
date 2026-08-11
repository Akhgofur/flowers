import { CATEGORIES, PRODUCTS } from "@/data/catalog";
import type { Locale } from "@/i18n/config";
import type { AppInitialCatalogFilters } from "@/app/App";
import type {
  CatalogCategory,
  CatalogProduct,
  PublicCatalogFilters,
  PublicSiteSettings,
} from "@/lib/contracts";
import {
  getPublishedCatalog,
  getPublishedCategories,
} from "@/lib/services/catalog-service";
import {
  getDefaultPublicSiteSettings,
  getPublicSiteSettings,
} from "@/lib/services/public-settings-service";
import {
  toBootstrapCatalogCategory,
  toBootstrapCatalogProduct,
} from "./storefront-mappers";
import { StorefrontClient } from "./StorefrontClient";

type StorefrontData = {
  products: CatalogProduct[];
  categories: CatalogCategory[];
  settings: PublicSiteSettings;
  source: "mongo" | "bootstrap";
};

export type StorefrontShellProps = {
  locale: Locale;
  filters?: PublicCatalogFilters;
};

function toInitialClientFilters(
  filters: PublicCatalogFilters
): AppInitialCatalogFilters {
  return {
    query: filters.query ?? "",
    category: filters.category ?? null,
    tab: filters.sale ? "sale" : "all",
  };
}

function bootstrapStorefrontData(locale: Locale): StorefrontData {
  return {
    products: PRODUCTS.map((product, index) =>
      toBootstrapCatalogProduct(product, index, locale)
    ),
    categories: CATEGORIES.map((category, index) =>
      toBootstrapCatalogCategory(category, index, locale)
    ),
    settings: getDefaultPublicSiteSettings(locale),
    source: "bootstrap",
  };
}

async function loadStorefrontData(
  locale: Locale,
  filters: PublicCatalogFilters
): Promise<StorefrontData> {
  try {
    const [products, categories, settings] = await Promise.all([
      getPublishedCatalog(locale, filters),
      getPublishedCategories(locale),
      getPublicSiteSettings(locale),
    ]);

    return { products, categories, settings, source: "mongo" };
  } catch (error) {
    // Local visual work remains useful before the owner supplies MONGODB_URI.
    // Production never silently presents bootstrap data as live inventory.
    if (process.env.NODE_ENV === "production") throw error;
    return bootstrapStorefrontData(locale);
  }
}

export async function StorefrontShell({
  locale,
  filters = {},
}: StorefrontShellProps) {
  const data = await loadStorefrontData(locale, filters);

  return (
    <>
      {data.source === "bootstrap" ? (
        <p className="storefront-data-notice" role="status">
          Demo katalogi ko‘rsatilmoqda — MongoDB ulangach haqiqiy mahsulot va qoldiqlar chiqadi.
        </p>
      ) : null}
      <StorefrontClient
        products={data.products}
        categories={data.categories}
        settings={data.settings}
        initialFilters={toInitialClientFilters(filters)}
      />
    </>
  );
}
