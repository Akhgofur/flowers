"use client";

import type { AppInitialCatalogFilters } from "@/app/App";
import type { CatalogCategory, CatalogProduct, PublicSiteSettings } from "@/lib/contracts";
import type { HomePageCatalogData } from "@/lib/services/home-merchandising-service";
import { HomePage } from "@/features/home/HomePage";
import { CatalogPageClient } from "./CatalogPageClient";
import { StorefrontFrame } from "./StorefrontFrame";

export type StorefrontClientProps = {
  products: readonly CatalogProduct[];
  categories: readonly CatalogCategory[];
  settings?: PublicSiteSettings;
  initialFilters?: AppInitialCatalogFilters;
  mode?: "home" | "catalog";
  merchandising?: HomePageCatalogData;
};

/** Browser-only interaction island. Server props intentionally contain no cart or favorites. */
export function StorefrontClient({
  products,
  categories,
  settings,
  initialFilters,
  mode = "catalog",
  merchandising,
}: StorefrontClientProps) {
  const appKey = [
    initialFilters?.category ?? "",
    initialFilters?.query ?? "",
    initialFilters?.tab ?? "all",
    initialFilters?.page ?? 1,
    initialFilters?.favoritesOnly ? "favorites" : "catalog",
  ].join("|");

  const frameProducts = mode === "home" && merchandising
    ? [
        ...new Map(
          [
            ...merchandising.dynamicSections.flatMap((section) => section.products),
            ...merchandising.bestSellers,
            ...merchandising.recommended,
          ].map((product) => [product.id, product])
        ).values(),
      ]
    : [...products];

  return (
    <StorefrontFrame key={appKey} products={frameProducts} settings={settings}>
      {mode === "home" && merchandising ? (
        <HomePage categories={categories} merchandising={merchandising} settings={settings} />
      ) : (
        <CatalogPageClient
          products={products}
          categories={categories}
          initialFilters={initialFilters}
        />
      )}
    </StorefrontFrame>
  );
}
