import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { buildPageMetadata } from "@/lib/seo";
import { getPublicSiteSettings } from "@/lib/services/public-settings-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: candidate } = await params;
  const locale = isLocale(candidate) ? candidate : DEFAULT_LOCALE;
  const [t, settings] = await Promise.all([
    getTranslations({ locale, namespace: "Metadata" }),
    getPublicSiteSettings(locale),
  ]);

  return buildPageMetadata({
    locale,
    title: settings.seoTitle?.trim() || t("homeTitle"),
    description: settings.seoDescription?.trim() || t("homeDescription"),
    path: "/",
    settings,
  });
}

export const dynamic = "force-dynamic";

export default async function StorePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: candidate } = await params;
  const locale = isLocale(candidate) ? candidate : DEFAULT_LOCALE;
  const storefront = await StorefrontShell({ locale });
  return storefront;
}
