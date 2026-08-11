import type { Metadata } from "next";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";

export const metadata: Metadata = {
  title: "Nafis Flowers",
  description:
    "Signature bouquets, fresh flowers and thoughtful delivery across Tashkent.",
};

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
