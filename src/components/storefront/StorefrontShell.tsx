import { CATEGORIES, PRODUCTS } from "@/data/catalog";
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
  DEFAULT_PUBLIC_SITE_SETTINGS,
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

function bootstrapStorefrontData(): StorefrontData {
  return {
    products: PRODUCTS.map(toBootstrapCatalogProduct),
    categories: CATEGORIES.map(toBootstrapCatalogCategory),
    settings: { ...DEFAULT_PUBLIC_SITE_SETTINGS },
    source: "bootstrap",
  };
}

async function loadStorefrontData(
  filters: PublicCatalogFilters
): Promise<StorefrontData> {
  try {
    const [products, categories, settings] = await Promise.all([
      getPublishedCatalog(filters),
      getPublishedCategories(),
      getPublicSiteSettings(),
    ]);

    return { products, categories, settings, source: "mongo" };
  } catch (error) {
    // Local visual work remains useful before the owner supplies MONGODB_URI.
    // Production never silently presents bootstrap data as live inventory.
    if (process.env.NODE_ENV === "production") throw error;
    return bootstrapStorefrontData();
  }
}

export async function StorefrontShell({
  filters = {},
}: StorefrontShellProps) {
  const data = await loadStorefrontData(filters);

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
