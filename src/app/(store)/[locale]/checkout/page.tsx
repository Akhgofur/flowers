import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { PRODUCTS } from "@/data/catalog";
import type { CatalogProduct } from "@/lib/contracts";
import { getEntirePublishedCatalog } from "@/lib/services/catalog-service";
import { toBootstrapCatalogProduct } from "@/components/storefront/storefront-mappers";
import type { Locale } from "@/i18n/config";
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
    title: t("checkoutTitle"),
    description: t("checkoutDescription"),
    path: "/checkout",
    settings,
    index: false,
  });
}

export const dynamic = "force-dynamic";

async function loadCheckoutProducts(locale: Locale): Promise<{
  products: CatalogProduct[];
  isDemoCatalog: boolean;
  catalogTruncated: boolean;
}> {
  try {
    const catalog = await getEntirePublishedCatalog(locale);
    return {
      products: catalog.products,
      isDemoCatalog: false,
      catalogTruncated: catalog.truncated,
    };
  } catch {
    if (process.env.NODE_ENV === "production") throw new Error("Checkout catalog is unavailable.");

    return {
      products: PRODUCTS.map((product, index) =>
        toBootstrapCatalogProduct(product, index, locale)
      ),
      isDemoCatalog: true,
      catalogTruncated: false,
    };
  }
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: candidate } = await params;
  const locale = isLocale(candidate) ? candidate : DEFAULT_LOCALE;
  const { products, isDemoCatalog, catalogTruncated } =
    await loadCheckoutProducts(locale);
  return (
    <CheckoutClient
      products={products}
      isDemoCatalog={isDemoCatalog}
      catalogTruncated={catalogTruncated}
    />
  );
}
