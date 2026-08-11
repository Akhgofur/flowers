import type { MetadataRoute } from "next";
import { CATEGORIES, PRODUCTS } from "@/data/catalog";
import type { PublicSitemapEntries } from "@/lib/contracts";
import { absoluteUrl } from "@/lib/seo";
import { getPublishedSitemapEntries } from "@/lib/services/catalog-service";

export const dynamic = "force-dynamic";

const BOOTSTRAP_UPDATED_AT = new Date("2026-08-11T00:00:00.000Z");

function bootstrapSitemapEntries(): PublicSitemapEntries {
  return {
    products: PRODUCTS.map((product) => ({
      slug: product.slug ?? product.id,
      updatedAt: BOOTSTRAP_UPDATED_AT,
    })),
    categories: CATEGORIES.map((category) => ({
      slug: category.id,
      updatedAt: BOOTSTRAP_UPDATED_AT,
    })),
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

  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/gullar"), changeFrequency: "daily", priority: 0.9 },
    ...entries.categories.map((category) => ({
      url: absoluteUrl(`/gullar?category=${encodeURIComponent(category.slug)}`),
      lastModified: category.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...entries.products.map((product) => ({
      url: absoluteUrl(`/gullar/${encodeURIComponent(product.slug)}`),
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
