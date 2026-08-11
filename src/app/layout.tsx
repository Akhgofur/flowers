import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
  getSiteUrl,
  serializeJsonLd,
} from "@/lib/seo";
import { getPublicSiteSettings } from "@/lib/services/public-settings-service";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings();
  const title = settings.seoTitle ?? `${settings.siteName} — gullar yetkazib berish`;
  const description = settings.seoDescription ?? settings.siteDescription;

  return {
    metadataBase: getSiteUrl(),
    title: { default: title, template: `%s | ${settings.siteName}` },
    description,
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "uz_UZ",
      siteName: settings.siteName,
      title,
      description,
      ...(settings.seoOgImage
        ? { images: [{ url: settings.seoOgImage.url, alt: settings.seoOgImage.alt }] }
        : {}),
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const settings = await getPublicSiteSettings();
  const organizationJsonLd = serializeJsonLd(buildOrganizationJsonLd(settings));
  const websiteJsonLd = serializeJsonLd(buildWebsiteJsonLd(settings));

  return (
    <html lang="uz" data-scroll-behavior="smooth">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: organizationJsonLd }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: websiteJsonLd }}
        />
        {children}
      </body>
    </html>
  );
}
