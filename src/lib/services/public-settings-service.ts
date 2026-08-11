import "server-only";
import type { PublicSiteSettings } from "@/lib/contracts";
import { cacheSiteSettingsReader } from "@/lib/cache";
import { dbConnect } from "@/lib/mongodb";
import { SiteSettingsModel, type SiteSettingsDocument } from "@/models/SiteSettings";

export const DEFAULT_PUBLIC_SITE_SETTINGS: PublicSiteSettings = {
  siteName: "Nafis Flowers",
  siteDescription: "Toshkent bo'ylab nafis guldastalar va tezkor yetkazib berish xizmati.",
  phone: "+998 71 200 07 07",
  email: "salom@nafis.uz",
  address: "Yunusobod, Toshkent",
  workingHours: "08:00–22:00",
};

async function readPublicSiteSettings(): Promise<PublicSiteSettings> {
  await dbConnect();
  const document = (await SiteSettingsModel.findOne({ key: "default" })
    .lean()
    .exec()) as SiteSettingsDocument | null;

  if (!document) return { ...DEFAULT_PUBLIC_SITE_SETTINGS };

  return {
    siteName: document.siteName,
    siteDescription: document.siteDescription,
    ...(document.phone === undefined ? {} : { phone: document.phone }),
    ...(document.email === undefined ? {} : { email: document.email }),
    ...(document.address === undefined ? {} : { address: document.address }),
    ...(document.workingHours === undefined ? {} : { workingHours: document.workingHours }),
    ...(document.deliveryPolicy === undefined
      ? {}
      : { deliveryPolicy: document.deliveryPolicy }),
    ...(document.instagramUrl === undefined
      ? {}
      : { instagramUrl: document.instagramUrl }),
    ...(document.telegramUrl === undefined
      ? {}
      : { telegramUrl: document.telegramUrl }),
    ...(document.seoTitle === undefined ? {} : { seoTitle: document.seoTitle }),
    ...(document.seoDescription === undefined
      ? {}
      : { seoDescription: document.seoDescription }),
    ...(document.seoOgImage === undefined
      ? {}
      : { seoOgImage: { ...document.seoOgImage } }),
  };
}

const readCachedPublicSiteSettings = cacheSiteSettingsReader(readPublicSiteSettings);

/**
 * The local visual preview remains usable without user secrets. Production fails
 * closed rather than rendering fallback contacts as live business information.
 */
export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  try {
    return await readCachedPublicSiteSettings();
  } catch (error) {
    // Next pre-renders framework pages (including /_not-found) during `next build`.
    // Secrets are runtime deployment configuration, so build output uses stable defaults.
    const isProductionRuntime =
      process.env.NODE_ENV === "production" &&
      process.env.NEXT_PHASE !== "phase-production-build";
    if (isProductionRuntime) throw error;
    return { ...DEFAULT_PUBLIC_SITE_SETTINGS };
  }
}
