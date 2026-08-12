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
    seasons: ["all_year"],
    sortOrder: 1,
    isFeatured: false,
    isNew: true,
    isOnSale: false,
    status: "published",
    deliveryEstimate: "Bugun 2 soatda",
    size: "45 sm",
  },
  {
    id: "507f1f77bcf86cd799439012",
    name: "Oq atirgul buketi",
    slug: "oq-atirgul-buketi",
    shortDescription: "Oppoq atirgullardan tuzilgan buket.",
    description: "Nafis va sokin kayfiyat uchun oq atirgullar.",
    composition: ["Atirgul"],
    price: 220_000,
    currency: "UZS",
    images: [
      {
        url: "https://images.pexels.com/photos/1234568/roses.jpg",
        alt: "Oq atirgullardan tayyorlangan buket",
      },
    ],
    categorySlug: "roses",
    flowerTypes: ["rose"],
    colors: ["white"],
    seasons: ["all_year"],
    sortOrder: 2,
    isFeatured: false,
    isNew: false,
    isOnSale: false,
    status: "published",
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

  it("opens the favorites catalog with only products saved by this browser", async () => {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify([products[0]?.id])
    );

    render(
      <StorefrontClient
        products={products}
        categories={categories}
        initialFilters={{ favoritesOnly: true }}
      />,
      { locale: "uz" }
    );

    expect(
      await screen.findByRole("link", { name: /pushti lola buketini ko.rish/i })
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /oq atirgul buketini ko.rish/i })
    ).not.toBeInTheDocument();
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

  it("navigates from the product card to the locale-aware detail page", () => {
    render(<StorefrontClient products={products} categories={categories} />, {
      locale: "uz",
    });

    expect(
      screen.getByRole("link", { name: /pushti lola buketini ko.rish/i })
    ).toHaveAttribute("href", "/uz/products/pushti-lola-buketi");
    expect(screen.queryByRole("button", { name: /savatga qo.shish/i })).not.toBeInTheDocument();
  });

  it("paginates a large imported catalog without rendering every card at once", async () => {
    const user = userEvent.setup();
    const importedProducts = Array.from({ length: 25 }, (_, index) => ({
      ...products[0]!,
      id: `507f1f77bcf86cd79943${String(index).padStart(3, "0")}`,
      slug: `studio-bouquet-${index + 1}`,
      name: `Studio bouquet ${index + 1}`,
      sortOrder: index,
    }));

    render(
      <StorefrontClient products={importedProducts} categories={categories} />,
      { locale: "en" }
    );

    expect(document.querySelectorAll(".product-card")).toHaveLength(24);
    await user.click(screen.getByRole("button", { name: /next page/i }));
    expect(screen.getByRole("link", { name: /studio bouquet 25/i })).toBeVisible();
    expect(document.querySelectorAll(".product-card")).toHaveLength(1);
    await waitFor(() => {
      expect(document.getElementById("catalog-results-title")).toHaveFocus();
    });
  });
});
