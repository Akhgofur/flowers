"use client";

import App, { type AppInitialCatalogFilters } from "@/app/App";
import type { CatalogCategory, CatalogProduct, PublicSiteSettings } from "@/lib/contracts";
import { toClientCategory, toClientProduct } from "./storefront-mappers";

export type StorefrontClientProps = {
  products: readonly CatalogProduct[];
  categories: readonly CatalogCategory[];
  settings?: PublicSiteSettings;
  initialFilters?: AppInitialCatalogFilters;
};

/** Browser-only interaction island. Server props intentionally contain no cart or favorites. */
export function StorefrontClient({
  products,
  categories,
  settings,
  initialFilters,
}: StorefrontClientProps) {
  const appKey = [
    initialFilters?.category ?? "",
    initialFilters?.query ?? "",
    initialFilters?.tab ?? "all",
  ].join("|");

  return (
    <App
      key={appKey}
      products={products.map(toClientProduct)}
      categories={categories.map((category) => toClientCategory(category, products))}
      siteSettings={settings}
      initialFilters={initialFilters}
    />
  );
}
