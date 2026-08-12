import { PRODUCTS } from "../../data/catalog";
import type { CatalogFilters } from "../../shared/types";
import { DEFAULT_FILTERS, applyCatalogFilters } from "./catalog-utils";

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
