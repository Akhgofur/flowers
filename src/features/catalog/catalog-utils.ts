import type { CatalogFilters, Product } from "../../shared/types";

/**
 * Catalog state a server route may seed into the client island. Kept next to the
 * filter model itself so storefront components do not depend on a page module.
 */
export type InitialCatalogFilters = Partial<
  Pick<CatalogFilters, "query" | "category" | "tab">
> & { page?: number; favoritesOnly?: boolean };

export const DEFAULT_FILTERS: CatalogFilters = {
  query: "",
  category: null,
  flowerTypes: [],
  colors: [],
  minPrice: 20000,
  maxPrice: 1000000,
  tab: "all",
};

/**
 * Same fields the server-side catalog query searches, so a term that finds a
 * product through the API also finds it in the client-filtered catalog page.
 */
function searchHaystack(product: Product): string {
  return [product.name, product.shortDescription, ...product.composition]
    .join(" ")
    .toLocaleLowerCase("uz-UZ");
}

export function applyCatalogFilters(
  products: readonly Product[],
  filters: CatalogFilters
): Product[] {
  const query = filters.query.trim().toLocaleLowerCase("uz-UZ");

  return products.filter((product) => {
    if (query && !searchHaystack(product).includes(query)) {
      return false;
    }

    if (filters.category !== null && product.category !== filters.category) {
      return false;
    }

    if (
      (filters.tab === "new" && !product.isNew) ||
      (filters.tab === "sale" && !product.isOnSale)
    ) {
      return false;
    }

    if (
      filters.flowerTypes.length > 0 &&
      !product.flowerTypes.some((type) => filters.flowerTypes.includes(type))
    ) {
      return false;
    }

    if (
      filters.colors.length > 0 &&
      !product.colors.some((color) => filters.colors.includes(color))
    ) {
      return false;
    }

    return (
      product.price === undefined ||
      (product.price >= filters.minPrice && product.price <= filters.maxPrice)
    );
  });
}
