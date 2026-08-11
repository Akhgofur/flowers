import { NextIntlClientProvider, hasLocale } from "next-intl";
import type { Metadata } from "next";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { routing } from "@/i18n/routing";
import {
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
  getSiteUrl,
  serializeJsonLd,
} from "@/lib/seo";
import { getPublicSiteSettings } from "@/lib/services/public-settings-service";
import { fontVariables } from "@/app/fonts";
import "@/app/globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const [t, settings] = await Promise.all([
    getTranslations({ locale, namespace: "Metadata" }),
    getPublicSiteSettings(locale),
  ]);

  return {
    metadataBase: getSiteUrl(),
    title: {
      default: settings.seoTitle?.trim() || t("siteTitle"),
      template: `%s | ${settings.siteName}`,
    },
    description: settings.seoDescription?.trim() || t("siteDescription"),
  };
}

export default async function StoreLocaleLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  const [messages, settings] = await Promise.all([
    getMessages(),
    getPublicSiteSettings(locale),
  ]);
  const organizationJsonLd = serializeJsonLd(
    buildOrganizationJsonLd(locale, settings)
  );
  const websiteJsonLd = serializeJsonLd(buildWebsiteJsonLd(locale, settings));

  return (
    <html
      lang={locale}
      className={fontVariables}
      data-scroll-behavior="smooth"
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: organizationJsonLd }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: websiteJsonLd }}
        />
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
          timeZone="Asia/Tashkent"
        >
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
