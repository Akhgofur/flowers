import { describe, expect, it } from "vitest";
import type { CatalogProduct } from "@/lib/contracts";
import {
  buildBreadcrumbJsonLd,
  buildLanguageAlternates,
  buildOrganizationJsonLd,
  buildProductJsonLd,
  buildProductMetadata,
  buildWebsiteJsonLd,
  localizedPublicPath,
  serializeJsonLd,
  type PublicSeoSettings,
} from "./seo";

const settings: PublicSeoSettings = {
  siteName: "Floraluxe",
  siteDescription: "Toshkent bo'ylab nafis guldastalar.",
  phone: "+998712000707",
  email: "salom@floraluxe.uz",
  address: "Toshkent, O'zbekiston",
};

const product: CatalogProduct = {
  id: "507f1f77bcf86cd799439011",
  name: "Qirmizi atirgul buketi",
  slug: "qirmizi-atirgul-buketi",
  shortDescription: "Yangi qirmizi atirgullardan tuzilgan buket.",
  description: "Yaqin inson uchun nafis kompozitsiya.",
  composition: ["25 ta atirgul"],
  price: 535_000,
  currency: "UZS",
  images: [
    {
      url: "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg",
      alt: "Qirmizi atirgullar buketi",
    },
  ],
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

describe("public SEO builders", () => {
  it("builds Russian-default localized paths and hreflang alternates", () => {
    expect(localizedPublicPath("ru", "/")).toBe("/ru");
    expect(localizedPublicPath("en", "/catalog")).toBe("/en/catalog");
    expect(buildLanguageAlternates("/catalog")).toEqual({
      "ru-RU": "/ru/catalog",
      "uz-UZ": "/uz/catalog",
      en: "/en/catalog",
      "x-default": "/ru/catalog",
    });
  });

  it("builds canonical localized UZS Product JSON-LD for a published product", () => {
    const jsonLd = buildProductJsonLd(product, "ru", settings);

    expect(jsonLd).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      offers: {
        "@type": "Offer",
        priceCurrency: "UZS",
        price: "535000",
        availability: "https://schema.org/InStock",
      },
    });
    expect(jsonLd.url).toBe(
      "https://floraluxe.uz/ru/products/qirmizi-atirgul-buketi"
    );
    expect(jsonLd.inLanguage).toBe("ru-RU");
  });

  it("does not publish a structured Offer for an inquiry-only product", () => {
    const jsonLd = buildProductJsonLd({ ...product, price: undefined }, "ru", settings);

    expect(jsonLd).not.toHaveProperty("offers");
  });

  it("creates crawlable canonical metadata and escapes JSON-LD script contents", () => {
    const metadata = buildProductMetadata(product, "ru", settings);
    const breadcrumb = buildBreadcrumbJsonLd([
      { name: "Главная", path: "/ru" },
      { name: product.name, path: `/ru/products/${product.slug}` },
    ]);
    const serialized = serializeJsonLd({ description: "</script><script>alert(1)</script>" });

    expect(metadata.alternates?.canonical).toBe(
      "/ru/products/qirmizi-atirgul-buketi"
    );
    expect(metadata.alternates?.languages).toEqual({
      "ru-RU": "/ru/products/qirmizi-atirgul-buketi",
      "uz-UZ": "/uz/products/qirmizi-atirgul-buketi",
      en: "/en/products/qirmizi-atirgul-buketi",
      "x-default": "/ru/products/qirmizi-atirgul-buketi",
    });
    expect(metadata.openGraph).toMatchObject({
      locale: "ru_RU",
      alternateLocale: ["uz_UZ", "en_US"],
    });
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(breadcrumb).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [{ position: 1 }, { position: 2 }],
    });
    expect(serialized).not.toContain("</script>");
  });

  it("marks website structured data with the active language and URL", () => {
    expect(buildWebsiteJsonLd("en", settings)).toMatchObject({
      inLanguage: "en-US",
      url: "https://floraluxe.uz/en",
    });
  });

  it("identifies the business as an organization and florist", () => {
    expect(buildOrganizationJsonLd("ru", settings)).toMatchObject({
      "@type": ["Organization", "Florist"],
      name: "Floraluxe",
      inLanguage: "ru-RU",
    });
  });
});
