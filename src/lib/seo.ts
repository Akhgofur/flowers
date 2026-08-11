import type { Metadata } from "next";
import {
  DEFAULT_LOCALE,
  LOCALES,
  type Locale,
} from "@/i18n/config";
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
  seoTitle?: string;
  seoDescription?: string;
  seoOgImage?: { url: string; alt: string };
};

const HTML_LOCALES: Record<Locale, string> = {
  ru: "ru-RU",
  uz: "uz-UZ",
  en: "en-US",
};

const HREFLANG_LOCALES: Record<Locale, string> = {
  ru: "ru-RU",
  uz: "uz-UZ",
  en: "en",
};

const OPEN_GRAPH_LOCALES: Record<Locale, string> = {
  ru: "ru_RU",
  uz: "uz_UZ",
  en: "en_US",
};

export const DEFAULT_PUBLIC_SEO_SETTINGS: PublicSeoSettings = {
  siteName: "Nafis Flowers",
  siteDescription:
    "Авторские букеты и бережная доставка цветов по Ташкенту.",
  phone: "+998 71 200 07 07",
  email: "salom@nafis.uz",
  address: "Ташкент, Узбекистан",
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

export function localizedPublicPath(locale: Locale, path: string): string {
  const normalizedPath = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalizedPath}`;
}

export function buildLanguageAlternates(path: string): Record<string, string> {
  const languages = Object.fromEntries(
    LOCALES.map((locale) => [
      HREFLANG_LOCALES[locale],
      localizedPublicPath(locale, path),
    ])
  );

  return {
    ...languages,
    "x-default": localizedPublicPath(DEFAULT_LOCALE, path),
  };
}

export function buildAbsoluteLanguageAlternates(
  path: string
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(buildLanguageAlternates(path)).map(([language, value]) => [
      language,
      absoluteUrl(value),
    ])
  );
}

export function buildPageMetadata({
  locale,
  title,
  description,
  path,
  settings = DEFAULT_PUBLIC_SEO_SETTINGS,
  index = true,
}: {
  locale: Locale;
  title: string;
  description: string;
  path: string;
  settings?: PublicSeoSettings;
  index?: boolean;
}): Metadata {
  const canonicalPath = localizedPublicPath(locale, path);
  const alternateLocale = LOCALES.filter((candidate) => candidate !== locale).map(
    (candidate) => OPEN_GRAPH_LOCALES[candidate]
  );
  const images = settings.seoOgImage
    ? [{ url: settings.seoOgImage.url, alt: settings.seoOgImage.alt }]
    : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: buildLanguageAlternates(path),
    },
    robots: { index, follow: index },
    openGraph: {
      type: "website",
      locale: OPEN_GRAPH_LOCALES[locale],
      alternateLocale,
      title,
      description,
      url: canonicalPath,
      siteName: settings.siteName,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images?.map((image) => image.url),
    },
  };
}

export function buildProductMetadata(
  product: CatalogProduct,
  locale: Locale,
  settings: PublicSeoSettings = DEFAULT_PUBLIC_SEO_SETTINGS
): Metadata {
  const title = product.seoTitle?.trim() || product.name;
  const description = product.seoDescription?.trim() || product.shortDescription;

  return buildPageMetadata({
    locale,
    title,
    description,
    path: `/products/${product.slug}`,
    settings,
  });
}

export function buildProductJsonLd(
  product: CatalogProduct,
  locale: Locale,
  settings: PublicSeoSettings = DEFAULT_PUBLIC_SEO_SETTINGS
) {
  const productPath = localizedPublicPath(locale, `/products/${product.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    inLanguage: HTML_LOCALES[locale],
    name: product.name,
    description: product.seoDescription?.trim() || product.description,
    image: product.images.map((image) => image.url),
    sku: product.id,
    url: absoluteUrl(productPath),
    brand: {
      "@type": "Brand",
      name: settings.siteName,
    },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(productPath),
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
  locale: Locale,
  settings: PublicSeoSettings = DEFAULT_PUBLIC_SEO_SETTINGS
) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: settings.siteName,
    description: settings.siteDescription,
    url: absoluteUrl(localizedPublicPath(locale, "/")),
    inLanguage: HTML_LOCALES[locale],
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
  locale: Locale,
  settings: PublicSeoSettings = DEFAULT_PUBLIC_SEO_SETTINGS
) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.siteName,
    url: absoluteUrl(localizedPublicPath(locale, "/")),
    inLanguage: HTML_LOCALES[locale],
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
