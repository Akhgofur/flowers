"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/config";
import type { CatalogCategory, CatalogProduct } from "@/lib/contracts";
import { CategoryStrip } from "@/features/layout/CategoryStrip";
import { CatalogFilters } from "@/features/catalog/CatalogFilters";
import { CatalogGrid } from "@/features/catalog/CatalogGrid";
import { MobileFilterDrawer } from "@/features/catalog/MobileFilterDrawer";
import {
  DEFAULT_FILTERS,
  applyCatalogFilters,
  type InitialCatalogFilters,
} from "@/features/catalog/catalog-utils";
import type { CatalogFilters as CatalogFilterState, CatalogTab } from "@/shared/types";
import { toClientCategory, toClientProduct } from "./storefront-mappers";
import { useStorefront } from "./StorefrontFrame";

export type CatalogPageClientProps = {
  products: readonly CatalogProduct[];
  categories: readonly CatalogCategory[];
  initialFilters?: InitialCatalogFilters;
};

const PAGE_SIZE = 24;

function createFilters(initial?: InitialCatalogFilters): CatalogFilterState {
  return {
    ...DEFAULT_FILTERS,
    flowerTypes: [...DEFAULT_FILTERS.flowerTypes],
    colors: [...DEFAULT_FILTERS.colors],
    query: initial?.query ?? "",
    category: initial?.category ?? null,
    tab: initial?.tab ?? "all",
  };
}

export function CatalogPageClient({
  products,
  categories,
  initialFilters,
}: CatalogPageClientProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Catalog");
  const { addProduct, favoriteIds, toggleFavorite } = useStorefront();
  const clientProducts = useMemo(() => products.map(toClientProduct), [products]);
  const clientCategories = useMemo(
    () => categories.map((category) => toClientCategory(category, products)),
    [categories, products]
  );
  const [draftFilters, setDraftFilters] = useState(() => createFilters(initialFilters));
  const [appliedFilters, setAppliedFilters] = useState(() => createFilters(initialFilters));
  const [favoritesOnly, setFavoritesOnly] = useState(
    () => initialFilters?.favoritesOnly === true
  );
  const [page, setPage] = useState(() => initialFilters?.page ?? 1);
  const filteredProducts = useMemo(
    () => {
      const filtered = applyCatalogFilters(clientProducts, appliedFilters);
      return favoritesOnly
        ? filtered.filter((product) => favoriteIds.includes(product.id))
        : filtered;
    },
    [appliedFilters, clientProducts, favoriteIds, favoritesOnly]
  );
  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleProducts = useMemo(
    () => filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, filteredProducts]
  );
  const categoryNames = useMemo(
    () => new Map(clientCategories.map((category) => [category.id, category.title])),
    [clientCategories]
  );

  const syncUrl = (filters: CatalogFilterState, nextPage = 1) => {
    const params = new URLSearchParams();
    if (filters.query.trim()) params.set("q", filters.query.trim());
    if (filters.category) params.set("category", filters.category);
    if (filters.tab === "sale") params.set("sale", "true");
    if (favoritesOnly) params.set("favorites", "true");
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    window.history.pushState(null, "", `/${locale}/catalog${query ? `?${query}` : ""}`);
  };

  const apply = () => {
    const next = {
      ...draftFilters,
      flowerTypes: [...draftFilters.flowerTypes],
      colors: [...draftFilters.colors],
    };
    setAppliedFilters(next);
    setPage(1);
    syncUrl(next, 1);
  };

  const reset = () => {
    const next = createFilters();
    setDraftFilters(next);
    setAppliedFilters(next);
    setPage(1);
    syncUrl(next, 1);
  };

  const selectTab = (tab: CatalogTab) => {
    const next = { ...appliedFilters, tab };
    setAppliedFilters(next);
    setDraftFilters((current) => ({ ...current, tab }));
    setPage(1);
    syncUrl(next, 1);
  };

  const selectPage = (nextPage: number) => {
    const safePage = Math.max(1, Math.min(pageCount, nextPage));
    setPage(safePage);
    syncUrl(appliedFilters, safePage);
    requestAnimationFrame(() => {
      document.getElementById("catalog-results-title")?.focus({ preventScroll: true });
      const toolbar = document.querySelector(".catalog-toolbar");
      if (toolbar instanceof HTMLElement && typeof toolbar.scrollIntoView === "function") {
        toolbar.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  useEffect(() => {
    const restoreUrlState = () => {
      const params = new URLSearchParams(window.location.search);
      const restored = createFilters({
        query: params.get("q") ?? "",
        category: params.get("category"),
        tab: params.get("sale") === "true" ? "sale" : "all",
      });
      setFavoritesOnly(params.get("favorites") === "true");
      const restoredPage = Number(params.get("page") ?? "1");
      setDraftFilters(restored);
      setAppliedFilters(restored);
      setPage(Number.isSafeInteger(restoredPage) && restoredPage > 0 ? restoredPage : 1);
    };

    window.addEventListener("popstate", restoreUrlState);
    return () => window.removeEventListener("popstate", restoreUrlState);
  }, []);

  return (
    <main className="catalog-page" aria-labelledby="catalog-page-title">
      <section className="catalog-page__intro">
        <div className="shell">
          <p className="eyebrow">{t("showcaseKicker")}</p>
          <h1 id="catalog-page-title">{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
      </section>

      <CategoryStrip
        categories={clientCategories}
        selectedCategory={draftFilters.category}
        hrefForCategory={(category) => `/catalog?category=${encodeURIComponent(category)}`}
      />

      <section className="catalog-showcase section" aria-labelledby="catalog-results-title">
        <div className="shell">
          <div className="catalog-heading">
            <div>
              <p className="eyebrow">{t("kicker")}</p>
              <h2 id="catalog-results-title" tabIndex={-1}>{t("showcaseTitle")}</h2>
            </div>
            <p>{t("showcaseDescription")}</p>
          </div>
          <MobileFilterDrawer
            filters={draftFilters}
            onChange={setDraftFilters}
            onApply={apply}
            onReset={reset}
          />
          <div className="catalog-layout">
            <CatalogFilters
              filters={draftFilters}
              onChange={setDraftFilters}
              onApply={apply}
              onReset={reset}
            />
            <CatalogGrid
              products={visibleProducts}
              categoryNames={categoryNames}
              activeTab={appliedFilters.tab}
              onTabChange={selectTab}
              onOpenProduct={(product) =>
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- product data is server-rendered at the destination
                window.location.assign(`/${locale}/products/${product.slug ?? product.id}`)
              }
              onAddToCart={(product) => addProduct(product.id)}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              onReset={reset}
              navigationOnly
              totalCount={filteredProducts.length}
            />
            {pageCount > 1 ? (
              <nav className="catalog-pagination" aria-label={t("paginationLabel")}>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  aria-label={t("previousPage")}
                  onClick={() => selectPage(currentPage - 1)}
                >
                  <span aria-hidden="true">←</span>
                </button>
                <span>{t("pageLabel", { page: currentPage, pages: pageCount })}</span>
                <button
                  type="button"
                  disabled={currentPage === pageCount}
                  aria-label={t("nextPage")}
                  onClick={() => selectPage(currentPage + 1)}
                >
                  <span aria-hidden="true">→</span>
                </button>
              </nav>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
