import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CatalogCategory, CatalogProduct } from "@/lib/contracts";
import { renderWithIntl as render } from "@/test/render-with-intl";
import { HomePage } from "./HomePage";

const product: CatalogProduct = {
  id: "507f1f77bcf86cd799439011",
  slug: "signature-rose",
  name: "Signature Rose",
  shortDescription: "Premium bouquet",
  description: "Premium bouquet",
  composition: ["Rose"],
  price: 420_000,
  currency: "UZS",
  images: [{ url: "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg", alt: "Rose" }],
  categorySlug: "roses",
  flowerTypes: ["rose"],
  colors: ["red"],
  seasons: ["all_year"],
  sortOrder: 1,
  isFeatured: true,
  isNew: false,
  isOnSale: false,
  status: "published",
};

const category: CatalogCategory = {
  id: "507f191e810c19729de860ea",
  slug: "roses",
  name: "Roses",
  order: 1,
  status: "published",
};

describe("HomePage", () => {
  it("renders dynamic, best-seller, and recommendation rails without catalog filters", () => {
    render(
      <HomePage
        categories={[category]}
        merchandising={{
          dynamicSections: [{
            id: "section-1",
            title: "Top flowers",
            productIds: [product.id],
            sortOrder: 1,
            products: [product],
          }],
          bestSellers: [product],
          recommended: [product],
        }}
      />,
      { locale: "en" }
    );

    expect(screen.getByRole("heading", { name: "Top flowers" })).toBeVisible();
    expect(screen.getByRole("heading", { name: /best sellers/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /recommended/i })).toBeVisible();
    expect(screen.queryByRole("heading", { name: /filters/i })).not.toBeInTheDocument();
  });

  /**
   * The rails carry a merchandised subset, so counting them reported "0 options"
   * for every category no rail happened to feature.
   */
  it("shows whole-catalog totals rather than counting the merchandised rails", () => {
    render(
      <HomePage
        categories={[category, { ...category, id: "tulips", slug: "tulips", name: "Tulips" }]}
        merchandising={{
          dynamicSections: [],
          bestSellers: [product],
          recommended: [product],
        }}
        categoryProductCounts={{ roses: 12, tulips: 5 }}
      />,
      { locale: "en" }
    );

    expect(screen.getByText("12 options")).toBeVisible();
    expect(screen.getByText("5 options")).toBeVisible();
  });

  it("falls back to zero for a category missing from the counts", () => {
    render(
      <HomePage
        categories={[category]}
        merchandising={{ dynamicSections: [], bestSellers: [product], recommended: [product] }}
        categoryProductCounts={{}}
      />,
      { locale: "en" }
    );

    expect(screen.getByText("0 options")).toBeVisible();
  });
});
