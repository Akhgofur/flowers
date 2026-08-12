import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { CatalogProduct } from "@/lib/contracts";
import { renderWithIntl as render } from "@/test/render-with-intl";
import { ProductDetail } from "./ProductDetail";

const product: CatalogProduct = {
  id: "507f1f77bcf86cd799439011",
  slug: "studio-gallery-bouquet",
  name: "Gallery bouquet",
  shortDescription: "Two views of one bouquet.",
  description: "One bouquet photographed from two angles.",
  composition: ["Roses"],
  currency: "UZS",
  images: [
    { url: "https://example.com/front.jpg", alt: "Front view" },
    { url: "https://example.com/side.jpg", alt: "Side view" },
  ],
  categorySlug: "mixed",
  flowerTypes: ["mixed"],
  colors: ["pink"],
  seasons: ["all_year"],
  stockQuantity: 10,
  sortOrder: 1,
  isFeatured: false,
  isNew: true,
  isOnSale: false,
  status: "published",
};

describe("ProductDetail gallery", () => {
  it("keeps confirmed alternate photos on one product and switches the main image", async () => {
    const user = userEvent.setup();
    render(<ProductDetail product={product} />, { locale: "en" });

    expect(screen.getByRole("button", { name: "Side view" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Side view" }));

    expect(screen.getByRole("img", { name: "Side view" })).toHaveAttribute(
      "src",
      expect.stringContaining("side.jpg")
    );
  });

  it("offers add-to-cart for a product with no price", () => {
    render(<ProductDetail product={{ ...product, price: undefined }} />, {
      locale: "en",
    });

    expect(screen.getByText("Price on request")).toBeVisible();
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeVisible();
  });
});
