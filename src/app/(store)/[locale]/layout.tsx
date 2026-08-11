import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { routing } from "@/i18n/routing";
import {
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
  serializeJsonLd,
} from "@/lib/seo";
import { getPublicSiteSettings } from "@/lib/services/public-settings-service";
import "@/app/globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
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
  const organizationJsonLd = serializeJsonLd(buildOrganizationJsonLd(settings));
  const websiteJsonLd = serializeJsonLd(buildWebsiteJsonLd(settings));

  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: organizationJsonLd }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: websiteJsonLd }}
        />
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
