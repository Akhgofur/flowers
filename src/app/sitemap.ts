import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/data/catalog";
import { LOCALES, type Locale } from "@/i18n/config";
import type { PublicSitemapEntries } from "@/lib/contracts";
import {
  absoluteUrl,
  buildAbsoluteLanguageAlternates,
  localizedPublicPath,
} from "@/lib/seo";
import { getPublishedSitemapEntries } from "@/lib/services/catalog-service";

export const dynamic = "force-dynamic";

const BOOTSTRAP_UPDATED_AT = new Date("2026-08-11T00:00:00.000Z");

function bootstrapSitemapEntries(): PublicSitemapEntries {
  return {
    products: PRODUCTS.map((product) => ({
      slug: product.slug ?? product.id,
      updatedAt: BOOTSTRAP_UPDATED_AT,
    })),
    categories: [],
  };
}

async function loadSitemapEntries(): Promise<PublicSitemapEntries> {
  try {
    return await getPublishedSitemapEntries();
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    return bootstrapSitemapEntries();
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await loadSitemapEntries();

  const localizedEntries = (
    path: string,
    config: Omit<MetadataRoute.Sitemap[number], "url" | "alternates">
  ): MetadataRoute.Sitemap =>
    LOCALES.map((locale: Locale) => ({
      ...config,
      url: absoluteUrl(localizedPublicPath(locale, path)),
      alternates: { languages: buildAbsoluteLanguageAlternates(path) },
    }));

  return [
    ...localizedEntries("/", { changeFrequency: "daily", priority: 1 }),
    ...localizedEntries("/catalog", {
      changeFrequency: "daily",
      priority: 0.9,
    }),
    ...entries.products.flatMap((product) =>
      localizedEntries(`/products/${encodeURIComponent(product.slug)}`, {
        lastModified: product.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      })
    ),
  ];
}
