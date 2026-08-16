import { PRODUCTS } from "../../data/catalog";
import type { CatalogFilters, Product } from "../../shared/types";
import {
  DEFAULT_FILTERS,
  FALLBACK_PRICE_CEILING,
  PRICE_FLOOR,
  PRICE_STEP,
  applyCatalogFilters,
  resolvePriceCeiling,
} from "./catalog-utils";

function pricedAt(price?: number): Product {
  return {
    id: `product-${price ?? "on-request"}`,
    name: "Buket",
    price,
    image: "",
    category: "mixed",
    flowerTypes: [],
    colors: [],
    isNew: false,
    isOnSale: false,
    shortDescription: "",
    composition: [],
    deliveryEstimate: "",
    size: "",
  };
}

it("combines query, flower type, color, and price constraints", () => {
  const result = applyCatalogFilters(PRODUCTS, {
    ...DEFAULT_FILTERS,
    query: "pion",
    flowerTypes: ["peony"],
    colors: ["pink"],
    minPrice: 400000,
    maxPrice: 600000,
  });

  expect(result.map((product) => product.id)).toEqual(["pink-peony"]);
});

it("returns no products for an unknown query", () => {
  expect(
    applyCatalogFilters(PRODUCTS, { ...DEFAULT_FILTERS, query: "mavjud emas" })
  ).toEqual([]);
});

it("combines category and sale tab filtering", () => {
  const result = applyCatalogFilters(PRODUCTS, {
    ...DEFAULT_FILTERS,
    category: "boxed",
    tab: "sale",
  });

  expect(result.map((product) => product.id)).toEqual(["rose-box"]);
});

it("includes products at the minimum and maximum price bounds", () => {
  const result = applyCatalogFilters(PRODUCTS, {
    ...DEFAULT_FILTERS,
    minPrice: 285000,
    maxPrice: 315000,
  });

  expect(result.map((product) => product.id)).toEqual([
    "morning-tulips",
    "coral-tulips",
  ]);
});

it("matches a query regardless of case and surrounding whitespace", () => {
  const result = applyCatalogFilters(PRODUCTS, {
    ...DEFAULT_FILTERS,
    query: "  PION  ",
  });

  expect(result.map((product) => product.id)).toEqual([
    "pink-peony",
    "wedding-pink",
  ]);
});

// The server searches name, shortDescription, description and composition. The
// catalog page filters on the client, so it must not be blind to composition.
it("matches a query against the composition, not only the name and summary", () => {
  const roses = PRODUCTS.find((product) => product.id === "scarlet-roses");
  expect(roses?.composition.join(" ")).toMatch(/evkalipt/i);

  const result = applyCatalogFilters(PRODUCTS, {
    ...DEFAULT_FILTERS,
    query: "evkalipt",
  });

  expect(result.map((product) => product.id)).toContain("scarlet-roses");
});

it("matches a partial word anywhere inside a field", () => {
  const result = applyCatalogFilters(PRODUCTS, {
    ...DEFAULT_FILTERS,
    query: "tirgul",
  });

  expect(result.length).toBeGreaterThan(0);
  for (const product of result) {
    const haystack = [
      product.name,
      product.shortDescription,
      ...product.composition,
    ]
      .join(" ")
      .toLocaleLowerCase("uz-UZ");
    expect(haystack).toContain("tirgul");
  }
});

it("does not mutate product order, products, or filters", () => {
  const products = PRODUCTS.map((product) => ({
    ...product,
    flowerTypes: [...product.flowerTypes],
    colors: [...product.colors],
    composition: [...product.composition],
  }));
  const filters: CatalogFilters = {
    ...DEFAULT_FILTERS,
    flowerTypes: ["rose"],
    colors: ["pink"],
  };
  const productSnapshot = structuredClone(products);
  const filterSnapshot = structuredClone(filters);

  applyCatalogFilters(products, filters);

  expect(products).toEqual(productSnapshot);
  expect(filters).toEqual(filterSnapshot);
  expect(products.map((product) => product.id)).toEqual(
    PRODUCTS.map((product) => product.id)
  );
});

it("caps the price slider at the dearest bouquet on offer", () => {
  expect(resolvePriceCeiling(PRODUCTS)).toBe(890000);
});

it("rounds the ceiling up onto the slider step so the dearest bouquet is reachable", () => {
  expect(resolvePriceCeiling([pricedAt(437001)])).toBe(440000);
  expect(resolvePriceCeiling([pricedAt(440000)])).toBe(440000);
});

it("ignores products priced on request when finding the ceiling", () => {
  const ceiling = resolvePriceCeiling([
    pricedAt(undefined),
    pricedAt(150000),
    pricedAt(undefined),
  ]);

  expect(ceiling).toBe(150000);
});

it("reports no ceiling at all when nothing in the catalogue is priced", () => {
  expect(resolvePriceCeiling([pricedAt(undefined), pricedAt(undefined)])).toBeNull();
  expect(resolvePriceCeiling([])).toBeNull();
});

it("distinguishes an unpriced catalogue from one topping out at the fallback", () => {
  expect(resolvePriceCeiling([pricedAt(FALLBACK_PRICE_CEILING)])).toBe(
    FALLBACK_PRICE_CEILING
  );
  expect(resolvePriceCeiling([pricedAt(undefined)])).toBeNull();
});

it("keeps the slider from collapsing on a catalogue priced below the floor", () => {
  expect(resolvePriceCeiling([pricedAt(5000)])).toBe(PRICE_FLOOR + PRICE_STEP);
});
