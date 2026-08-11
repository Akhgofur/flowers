import { CATEGORIES, HERO_SLIDES, PRODUCTS } from "./catalog";
import { formatSum } from "../shared/format";

const EXPECTED_CATEGORY_IDS = [
  "boxed",
  "mixed",
  "orchids",
  "roses",
  "tulips",
  "wedding",
];

it("provides exactly 12 products", () => {
  expect(PRODUCTS).toHaveLength(12);
});

it("provides complete Russian, Uzbek and English content for every record", () => {
  for (const product of PRODUCTS) {
    expect(Object.keys(product.translations).sort()).toEqual(["en", "ru", "uz"]);
    for (const translation of Object.values(product.translations)) {
      expect(translation.name.trim()).not.toBe("");
      expect(translation.shortDescription.trim()).not.toBe("");
      expect(translation.description.trim()).not.toBe("");
      expect(translation.composition.length).toBeGreaterThan(0);
    }
  }

  for (const category of CATEGORIES) {
    expect(Object.keys(category.translations).sort()).toEqual(["en", "ru", "uz"]);
    expect(
      Object.values(category.translations).every(
        (translation) => translation.name.trim().length > 0
      )
    ).toBe(true);
  }
});

it("provides unique product IDs", () => {
  expect(new Set(PRODUCTS.map((product) => product.id)).size).toBe(12);
});

it("provides the six expected unique category IDs", () => {
  const categoryIds = CATEGORIES.map((category) => category.id);

  expect(new Set(categoryIds).size).toBe(6);
  expect([...categoryIds].sort()).toEqual(EXPECTED_CATEGORY_IDS);
});

it("provides positive integer product prices", () => {
  expect(
    PRODUCTS.every(
      (product) => Number.isInteger(product.price) && product.price > 0
    )
  ).toBe(true);
});

it("uses HTTPS image URLs for products, categories, and hero slides", () => {
  const imageUrls = [
    ...PRODUCTS.map((product) => product.image),
    ...CATEGORIES.map((category) => category.image),
    ...HERO_SLIDES.map((slide) => slide.image),
  ];

  expect(imageUrls.every((url) => url.startsWith("https://"))).toBe(true);
});

it("provides unique products for every visible category", () => {
  expect(new Set(PRODUCTS.map((product) => product.id)).size).toBe(PRODUCTS.length);

  for (const category of CATEGORIES) {
    expect(PRODUCTS.some((product) => product.category === category.id)).toBe(true);
  }
});

it("formats Uzbek so'm values", () => {
  expect(formatSum(535000)).toContain("535");
  expect(formatSum(535000)).toContain("so'm");
});

it("provides three usable hero slides", () => {
  expect(HERO_SLIDES).toHaveLength(3);
  expect(HERO_SLIDES.every((slide) => slide.ctaTarget.startsWith("#"))).toBe(true);
});

it("provides the required pink peony bouquet facts", () => {
  const pinkPeony = PRODUCTS.find((product) => product.id === "pink-peony");

  expect(pinkPeony).toMatchObject({
    id: "pink-peony",
    isNew: true,
    price: expect.any(Number),
  });
  expect(pinkPeony?.name).toContain("Pushti pion buketi");
  expect(pinkPeony?.flowerTypes).toContain("peony");
  expect(pinkPeony?.colors).toContain("pink");
  expect(pinkPeony?.price).toBeGreaterThanOrEqual(400000);
  expect(pinkPeony?.price).toBeLessThanOrEqual(600000);
});
