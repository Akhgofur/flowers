import type { CatalogFilters, Product } from "../../shared/types";

/**
 * Catalog state a server route may seed into the client island. Kept next to the
 * filter model itself so storefront components do not depend on a page module.
 */
export type InitialCatalogFilters = Partial<
  Pick<CatalogFilters, "query" | "category" | "tab">
> & { page?: number; favoritesOnly?: boolean };

/** Both price sliders start here and move in PRICE_STEP increments. */
export const PRICE_FLOOR = 20_000;
export const PRICE_STEP = 5_000;

/**
 * Stands in for the ceiling where a number is required but the catalogue prices
 * nothing -- the filter state itself. The price filter is inert in that case,
 * because an unpriced product always passes it.
 */
export const FALLBACK_PRICE_CEILING = 1_000_000;

export const DEFAULT_FILTERS: CatalogFilters = {
  query: "",
  category: null,
  flowerTypes: [],
  colors: [],
  minPrice: PRICE_FLOOR,
  maxPrice: FALLBACK_PRICE_CEILING,
  tab: "all",
};

/**
 * The top of the price slider: the dearest bouquet on offer, rounded up onto the
 * slider's own step grid so that bouquet stays reachable at the far right. A
 * fixed ceiling either hides the dearest bouquets or -- as with a catalogue whose
 * single priced item costs half the old 1 000 000 limit -- wastes half the track.
 *
 * `null` means no bouquet carries a price, so there is no range to offer and the
 * filter should not be shown. That is a distinct answer from any number: a
 * catalogue topping out at exactly FALLBACK_PRICE_CEILING is not the same as one
 * priced entirely on request.
 */
export function resolvePriceCeiling(products: readonly Product[]): number | null {
  const priced = products
    .map((product) => product.price)
    .filter((price): price is number => typeof price === "number" && price > 0);

  if (priced.length === 0) return null;

  const dearest = Math.ceil(Math.max(...priced) / PRICE_STEP) * PRICE_STEP;
  // One step above the floor at minimum, or the slider would collapse on a
  // catalogue priced below PRICE_FLOOR.
  return Math.max(dearest, PRICE_FLOOR + PRICE_STEP);
}

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
