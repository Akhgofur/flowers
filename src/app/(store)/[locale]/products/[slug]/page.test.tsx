import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CatalogProduct } from "@/lib/contracts";
import { renderWithIntl as render } from "@/test/render-with-intl";

const catalogService = vi.hoisted(() => ({
  getPublishedProductBySlug: vi.fn(),
}));

vi.mock("@/lib/services/catalog-service", () => catalogService);
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async ({ namespace }: { namespace: string }) =>
    (key: string) => `${namespace}.${key}`
  ),
}));
vi.mock("@/components/storefront/LanguageSwitcher", () => ({
  LanguageSwitcher: () => <span>RU UZ EN</span>,
}));

import ProductPage, { generateMetadata } from "./page";

const product: CatalogProduct = {
  id: "507f1f77bcf86cd799439011",
  name: "Qirmizi atirgul buketi",
  slug: "qirmizi-atirgul-buketi",
  shortDescription: "Yurakdan aytilgan so‘zlar uchun baxmaldek atirgullar.",
  description: "Yaqin inson uchun qirmizi atirgullardan tayyorlangan kompozitsiya.",
  composition: ["25 ta qirmizi atirgul", "Evkalipt"],
  price: 535_000,
  originalPrice: 595_000,
  currency: "UZS",
  images: [
    {
      url: "https://images.pexels.com/photos/1234567/roses.jpg",
      alt: "Qirmizi atirgullardan tayyorlangan buket",
    },
  ],
  categorySlug: "roses",
  flowerTypes: ["rose"],
  colors: ["red"],
  seasons: ["all_year"],
  stockQuantity: 12,
  sortOrder: 1,
  isFeatured: true,
  isNew: false,
  isOnSale: true,
  status: "published",
  deliveryEstimate: "Bugun 90 daqiqada",
  size: "55 sm",
};

describe("product detail server route", () => {
  it("builds canonical metadata only from the public product", async () => {
    catalogService.getPublishedProductBySlug.mockResolvedValue(product);

    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "ru", slug: "qirmizi-atirgul-buketi" }),
    });

    expect(metadata.alternates?.canonical).toBe(
      "/ru/products/qirmizi-atirgul-buketi"
    );
    expect(metadata.alternates?.languages).toMatchObject({
      "ru-RU": "/ru/products/qirmizi-atirgul-buketi",
      "x-default": "/ru/products/qirmizi-atirgul-buketi",
    });
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it("renders a product detail from server data with a stable slug URL", async () => {
    catalogService.getPublishedProductBySlug.mockResolvedValue(product);

    render(
      await ProductPage({
        params: Promise.resolve({ locale: "ru", slug: "qirmizi-atirgul-buketi" }),
      })
    );

    expect(
      screen.getByRole("heading", { name: /qirmizi atirgul buketi/i })
    ).toBeVisible();
    expect(catalogService.getPublishedProductBySlug).toHaveBeenCalledWith(
      "ru",
      "qirmizi-atirgul-buketi"
    );
  });

  it("shows a contact action instead of purchase controls when the product is out of season", async () => {
    catalogService.getPublishedProductBySlug.mockResolvedValue({
      ...product,
      seasons: ["winter"],
    });

    render(
      await ProductPage({
        params: Promise.resolve({ locale: "ru", slug: product.slug }),
      })
    );

    expect(screen.getByRole("link", { name: /уточнить наличие/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/^(tel:|https:\/\/t\.me)/)
    );
    expect(screen.queryByRole("button", { name: /добавить в корзину/i })).not.toBeInTheDocument();
  });
});
