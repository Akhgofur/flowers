import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Product } from "../../shared/types";
import { renderWithIntl as render } from "@/test/render-with-intl";
import { CatalogGrid } from "./CatalogGrid";

const product: Product = {
  id: "507f1f77bcf86cd799439011",
  slug: "azure-surprise",
  name: "Azure surprise",
  image: "https://example.com/bouquet.jpg",
  category: "mixed",
  flowerTypes: ["mixed"],
  colors: ["blue"],
  isNew: true,
  isOnSale: false,
  shortDescription: "Blue chrysanthemums.",
  composition: ["Chrysanthemums"],
  deliveryEstimate: "Today",
  size: "40 cm",
};

function renderGrid(overrides: Partial<Product>, navigationOnly: boolean) {
  return render(
    <CatalogGrid
      products={[{ ...product, ...overrides }]}
      categoryNames={new Map([["mixed", "Mixed bouquets"]])}
      activeTab="all"
      onTabChange={vi.fn()}
      onOpenProduct={vi.fn()}
      onAddToCart={vi.fn()}
      favoriteIds={[]}
      onToggleFavorite={vi.fn()}
      onReset={vi.fn()}
      navigationOnly={navigationOnly}
    />,
    { locale: "en" }
  );
}

describe("CatalogGrid seasonal price note", () => {
  it("warns that prices move with the season on a linked card", () => {
    renderGrid({ price: 350000 }, true);

    expect(screen.getByText("Prices may vary by season")).toBeVisible();
  });

  it("warns on an interactive card too", () => {
    renderGrid({ price: 350000 }, false);

    expect(screen.getByText("Prices may vary by season")).toBeVisible();
  });

  it("warns even when the price is on request", () => {
    renderGrid({ price: undefined }, true);

    expect(screen.getByText("Price on request")).toBeVisible();
    expect(screen.getByText("Prices may vary by season")).toBeVisible();
  });
});
