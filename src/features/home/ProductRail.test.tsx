import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CatalogProduct } from "@/lib/contracts";
import { renderWithIntl as render } from "@/test/render-with-intl";
import { ProductRail } from "./ProductRail";

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

describe("ProductRail", () => {
  it("renders a locale-aware product link and boundary-safe controls", () => {
    render(
      <ProductRail
        title="Bestsellers"
        description="Most selected bouquets"
        products={[product]}
      />,
      { locale: "ru" }
    );

    expect(screen.getByRole("heading", { name: "Bestsellers" })).toBeVisible();
    expect(screen.getByRole("link", { name: /signature rose/i })).toHaveAttribute(
      "href",
      "/ru/products/signature-rose"
    );
    expect(screen.getByRole("button", { name: /предыдущ/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /следующ/i })).toBeDisabled();
  });
});
