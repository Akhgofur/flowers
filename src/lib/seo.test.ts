import { describe, expect, it } from "vitest";
import type { CatalogProduct } from "@/lib/contracts";
import {
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
  buildProductMetadata,
  serializeJsonLd,
  type PublicSeoSettings,
} from "./seo";

const settings: PublicSeoSettings = {
  siteName: "Nafis Flowers",
  siteDescription: "Toshkent bo'ylab nafis guldastalar.",
  phone: "+998712000707",
  email: "salom@nafis.uz",
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
  stockQuantity: 8,
  sortOrder: 1,
  isFeatured: true,
  isNew: false,
  isOnSale: false,
  status: "published",
};

describe("public SEO builders", () => {
  it("builds canonical UZS Product JSON-LD for a published product", () => {
    const jsonLd = buildProductJsonLd(product, settings);

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
    expect(jsonLd.url).toBe("https://nafis.uz/gullar/qirmizi-atirgul-buketi");
  });

  it("creates crawlable canonical metadata and escapes JSON-LD script contents", () => {
    const metadata = buildProductMetadata(product);
    const breadcrumb = buildBreadcrumbJsonLd([
      { name: "Bosh sahifa", path: "/" },
      { name: product.name, path: `/gullar/${product.slug}` },
    ]);
    const serialized = serializeJsonLd({ description: "</script><script>alert(1)</script>" });

    expect(metadata.alternates?.canonical).toBe(
      "/gullar/qirmizi-atirgul-buketi"
    );
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(breadcrumb).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [{ position: 1 }, { position: 2 }],
    });
    expect(serialized).not.toContain("</script>");
  });
});
