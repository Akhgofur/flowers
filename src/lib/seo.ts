import type { Metadata } from "next";
import type { CatalogProduct } from "@/lib/contracts";

const FALLBACK_SITE_URL = "https://nafis.uz";

export type PublicSeoSettings = {
  siteName: string;
  siteDescription: string;
  phone?: string;
  email?: string;
  address?: string;
  instagramUrl?: string;
  telegramUrl?: string;
};

export const DEFAULT_PUBLIC_SEO_SETTINGS: PublicSeoSettings = {
  siteName: "Nafis Flowers",
  siteDescription:
    "Toshkent bo'ylab nafis guldastalar va tezkor yetkazib berish xizmati.",
  phone: "+998 71 200 07 07",
  email: "salom@nafis.uz",
  address: "Toshkent, O'zbekiston",
};

export type BreadcrumbItem = {
  name: string;
  path: string;
};

function parseSiteUrl(value: string | undefined): URL {
  try {
    const parsed = new URL(value?.trim() || FALLBACK_SITE_URL);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Unsupported site URL protocol");
    }

    return new URL(parsed.origin);
  } catch {
    return new URL(FALLBACK_SITE_URL);
  }
}

export function getSiteUrl(): URL {
  return parseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
}

export function absoluteUrl(path: string): string {
  return new URL(path, getSiteUrl()).toString();
}

export function buildProductMetadata(
  product: CatalogProduct,
  settings: PublicSeoSettings = DEFAULT_PUBLIC_SEO_SETTINGS
): Metadata {
  const title = product.seoTitle?.trim() || product.name;
  const description = product.seoDescription?.trim() || product.shortDescription;
  const canonicalPath = `/gullar/${product.slug}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "uz_UZ",
      title,
      description,
      url: canonicalPath,
      siteName: settings.siteName,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function buildProductJsonLd(
  product: CatalogProduct,
  settings: PublicSeoSettings = DEFAULT_PUBLIC_SEO_SETTINGS
) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.seoDescription?.trim() || product.description,
    image: product.images.map((image) => image.url),
    sku: product.id,
    url: absoluteUrl(`/gullar/${product.slug}`),
    brand: {
      "@type": "Brand",
      name: settings.siteName,
    },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/gullar/${product.slug}`),
      priceCurrency: product.currency,
      price: String(product.price),
      availability:
        product.stockQuantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

export function buildBreadcrumbJsonLd(items: readonly BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildOrganizationJsonLd(
  settings: PublicSeoSettings = DEFAULT_PUBLIC_SEO_SETTINGS
) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: settings.siteName,
    description: settings.siteDescription,
    url: getSiteUrl().toString(),
    telephone: settings.phone,
    email: settings.email,
    address: settings.address
      ? {
          "@type": "PostalAddress",
          addressLocality: "Toshkent",
          addressCountry: "UZ",
          streetAddress: settings.address,
        }
      : undefined,
    sameAs: [settings.instagramUrl, settings.telegramUrl].filter(
      (value): value is string => Boolean(value)
    ),
  };
}

export function buildWebsiteJsonLd(
  settings: PublicSeoSettings = DEFAULT_PUBLIC_SEO_SETTINGS
) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.siteName,
    url: getSiteUrl().toString(),
    inLanguage: "uz",
  };
}

/** Escapes values that would otherwise terminate an application/ld+json script node. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
