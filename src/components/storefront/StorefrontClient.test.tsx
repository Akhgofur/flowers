import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogCategory, CatalogProduct } from "@/lib/contracts";
import { FAVORITES_STORAGE_KEY } from "@/features/cart/cart-storage";
import { renderWithIntl as render } from "@/test/render-with-intl";
import { StorefrontClient } from "./StorefrontClient";

vi.mock("@/components/storefront/LanguageSwitcher", () => ({
  LanguageSwitcher: () => <div aria-label="Til">RU UZ EN</div>,
}));

const products: CatalogProduct[] = [
  {
    id: "507f1f77bcf86cd799439011",
    name: "Pushti lola buketi",
    slug: "pushti-lola-buketi",
    shortDescription: "Yangi lolalardan tuzilgan mayin kompozitsiya.",
    description: "Bayram va yaqin insonlar uchun nafis sovg‘a.",
    composition: ["Lola", "Yashil barglar"],
    price: 150_000,
    currency: "UZS",
    images: [
      {
        url: "https://images.pexels.com/photos/1234567/tulips.jpg",
        alt: "Pushti lolalardan tayyorlangan buket",
      },
    ],
    categorySlug: "tulips",
    flowerTypes: ["tulip"],
    colors: ["pink"],
    stockQuantity: 12,
    sortOrder: 1,
    isFeatured: false,
    isNew: true,
    isOnSale: false,
    status: "published",
    deliveryEstimate: "Bugun 2 soatda",
    size: "45 sm",
  },
];

const categories: CatalogCategory[] = [
  {
    id: "507f191e810c19729de860ea",
    name: "Lolalar",
    slug: "tulips",
    order: 1,
    status: "published",
    image: {
      url: "https://images.pexels.com/photos/1234567/tulips.jpg",
      alt: "Lolalar kategoriyasi",
    },
  },
];

describe("StorefrontClient", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps favorites in browser storage without serializing them into server props", async () => {
    const user = userEvent.setup();

    render(<StorefrontClient products={products} categories={categories} />, {
      locale: "uz",
    });

    await user.click(
      screen.getByRole("button", {
        name: /pushti lola buketi.*sevimlilarga qo.shish/i,
      })
    );

    await waitFor(() => {
      expect(localStorage.getItem(FAVORITES_STORAGE_KEY)).toContain(products[0]?.id);
    });
  });

  it("honors catalog state supplied by the server route", () => {
    render(
      <StorefrontClient
        products={products}
        categories={categories}
        initialFilters={{ category: "tulips", query: "lola", tab: "sale" }}
      />,
      { locale: "uz" }
    );

    expect(screen.getByRole("searchbox", { name: /mahsulot qidirish/i })).toHaveValue(
      "lola"
    );
    expect(screen.getByRole("button", { name: /^aksiya$/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});
