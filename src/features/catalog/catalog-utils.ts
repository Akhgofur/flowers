import type { CatalogFilters, Product } from "../../shared/types";

export const DEFAULT_FILTERS: CatalogFilters = {
  query: "",
  category: null,
  flowerTypes: [],
  colors: [],
  minPrice: 20000,
  maxPrice: 1000000,
  tab: "all",
};

export function applyCatalogFilters(
  products: readonly Product[],
  filters: CatalogFilters
): Product[] {
  const query = filters.query.trim().toLocaleLowerCase("uz-UZ");

  return products.filter((product) => {
    if (
      query &&
      !product.name.toLocaleLowerCase("uz-UZ").includes(query) &&
      !product.shortDescription.toLocaleLowerCase("uz-UZ").includes(query)
    ) {
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

    return product.price >= filters.minPrice && product.price <= filters.maxPrice;
  });
}
