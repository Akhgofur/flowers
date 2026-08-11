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
import { getTranslations } from "next-intl/server";
import {
  getHomePageCatalogData,
  type HomePageCatalogData,
} from "@/lib/services/home-merchandising-service";

type StorefrontData = {
  products: CatalogProduct[];
  categories: CatalogCategory[];
  settings: PublicSiteSettings;
  source: "mongo" | "bootstrap";
};

export type StorefrontShellProps = {
  locale: Locale;
  filters?: PublicCatalogFilters;
  mode?: "home" | "catalog";
};

function toInitialClientFilters(
  filters: PublicCatalogFilters
): AppInitialCatalogFilters {
  return {
    query: filters.query ?? "",
    category: filters.category ?? null,
    tab: filters.sale ? "sale" : "all",
    page: filters.page ?? 1,
    favoritesOnly: filters.favorites === true,
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
  locale: Locale
): Promise<StorefrontData> {
  try {
    const [products, categories, settings] = await Promise.all([
      getPublishedCatalog(locale, { page: 1, limit: 200 }),
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
  mode = "catalog",
}: StorefrontShellProps) {
  let data: StorefrontData;
  let merchandising: HomePageCatalogData | undefined;

  if (mode === "home") {
    try {
      const [categories, settings, homeData] = await Promise.all([
        getPublishedCategories(locale),
        getPublicSiteSettings(locale),
        getHomePageCatalogData(locale),
      ]);
      merchandising = homeData;
      data = { products: [], categories, settings, source: "mongo" };
    } catch (error) {
      if (process.env.NODE_ENV === "production") throw error;
      data = bootstrapStorefrontData(locale);
      const fallbackProducts = data.products;
      merchandising = {
        dynamicSections: [],
        bestSellers: fallbackProducts.slice(0, 8),
        recommended: fallbackProducts.slice(0, 12),
      };
    }
  } else {
    data = await loadStorefrontData(locale);
  }
  const t = await getTranslations({ locale, namespace: "Errors" });

  return (
    <>
      {data.source === "bootstrap" ? (
        <p className="storefront-data-notice" role="status">
          {t("demoCatalog")}
        </p>
      ) : null}
      <StorefrontClient
        products={data.products}
        categories={data.categories}
        settings={data.settings}
        initialFilters={toInitialClientFilters(filters)}
        mode={mode}
        merchandising={merchandising}
      />
    </>
  );
}
