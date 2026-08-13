import "server-only";
import type { PublicSiteSettings, SiteSettingsTranslation } from "@/lib/contracts";
import type { Locale } from "@/i18n/config";
import { cacheSiteSettingsReader } from "@/lib/cache";
import { resolveSiteSettingsTranslation } from "@/lib/locale-content";
import { dbConnect } from "@/lib/mongodb";
import { CURRENT_SITE_NAME, resolveSiteName } from "@/lib/site-name";
import { SiteSettingsModel, type SiteSettingsDocument } from "@/models/SiteSettings";

const DEFAULT_TRANSLATIONS: Record<Locale, SiteSettingsTranslation> = {
  ru: {
    siteDescription: "Авторские букеты и бережная доставка цветов по Ташкенту.",
    deliveryPolicy: "Доставка по Ташкенту, время подтверждает оператор.",
  },
  uz: {
    siteDescription: "Toshkent bo‘ylab mualliflik buketlari va ehtiyotkor yetkazib berish.",
    deliveryPolicy: "Toshkent bo‘ylab yetkazamiz, vaqtni operator tasdiqlaydi.",
  },
  en: {
    siteDescription: "Signature bouquets and thoughtful flower delivery across Tashkent.",
    deliveryPolicy: "Delivery across Tashkent; timing is confirmed by our operator.",
  },
};

const DEFAULT_UNIVERSAL_SETTINGS = {
  siteName: CURRENT_SITE_NAME,
  brandLogo: { url: "/brand/floraluxe-logo.png", alt: "Floraluxe" },
  brandMark: { url: "/brand/floraluxe-mark.png", alt: "Floraluxe belgisi" },
  phone: "+998 88 780 22 08",
  address: "Yunusobod, Toshkent",
  workingHours: "08:00–22:00",
};

export function getDefaultPublicSiteSettings(locale: Locale): PublicSiteSettings {
  return { ...DEFAULT_UNIVERSAL_SETTINGS, ...DEFAULT_TRANSLATIONS[locale] };
}

export const DEFAULT_PUBLIC_SITE_SETTINGS = getDefaultPublicSiteSettings("ru");

async function readPublicSiteSettings(locale: Locale): Promise<PublicSiteSettings> {
  await dbConnect();
  const document = (await SiteSettingsModel.findOne({ key: "default" })
    .lean()
    .exec()) as SiteSettingsDocument | null;

  if (!document) return getDefaultPublicSiteSettings(locale);

  const translation =
    resolveSiteSettingsTranslation(document, locale) ?? DEFAULT_TRANSLATIONS[locale];

  return {
    siteName: resolveSiteName(document.siteName),
    brandLogo: document.brandLogo === undefined
      ? { ...DEFAULT_UNIVERSAL_SETTINGS.brandLogo }
      : { ...document.brandLogo },
    brandMark: document.brandMark === undefined
      ? { ...DEFAULT_UNIVERSAL_SETTINGS.brandMark }
      : { ...document.brandMark },
    siteDescription: translation.siteDescription,
    ...(document.phone === undefined ? {} : { phone: document.phone }),
    ...(document.email === undefined ? {} : { email: document.email }),
    ...(document.address === undefined ? {} : { address: document.address }),
    ...(document.workingHours === undefined ? {} : { workingHours: document.workingHours }),
    ...(translation.deliveryPolicy === undefined
      ? {}
      : { deliveryPolicy: translation.deliveryPolicy }),
    ...(document.instagramUrl === undefined
      ? {}
      : { instagramUrl: document.instagramUrl }),
    ...(document.telegramUrl === undefined
      ? {}
      : { telegramUrl: document.telegramUrl }),
    ...(translation.seoTitle === undefined ? {} : { seoTitle: translation.seoTitle }),
    ...(translation.seoDescription === undefined
      ? {}
      : { seoDescription: translation.seoDescription }),
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
export async function getPublicSiteSettings(locale: Locale): Promise<PublicSiteSettings> {
  try {
    return await readCachedPublicSiteSettings(locale);
  } catch (error) {
    // Next pre-renders framework pages (including /_not-found) during `next build`.
    // Secrets are runtime deployment configuration, so build output uses stable defaults.
    const isProductionRuntime =
      process.env.NODE_ENV === "production" &&
      process.env.NEXT_PHASE !== "phase-production-build";
    if (isProductionRuntime) throw error;
    return getDefaultPublicSiteSettings(locale);
  }
}
