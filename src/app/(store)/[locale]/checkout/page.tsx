import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { PRODUCTS } from "@/data/catalog";
import type { CatalogProduct } from "@/lib/contracts";
import { getPublishedCatalog } from "@/lib/services/catalog-service";
import { toBootstrapCatalogProduct } from "@/components/storefront/storefront-mappers";
import type { Locale } from "@/i18n/config";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Nafis Flowers delivery order.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function loadCheckoutProducts(locale: Locale): Promise<{
  products: CatalogProduct[];
  isDemoCatalog: boolean;
}> {
  try {
    const products = await getPublishedCatalog(locale, { limit: 48 });
    return { products, isDemoCatalog: false };
  } catch {
    if (process.env.NODE_ENV === "production") throw new Error("Checkout catalog is unavailable.");

    return {
      products: PRODUCTS.map((product, index) =>
        toBootstrapCatalogProduct(product, index, locale)
      ),
      isDemoCatalog: true,
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
  const { products, isDemoCatalog } = await loadCheckoutProducts(locale);
  return <CheckoutClient products={products} isDemoCatalog={isDemoCatalog} />;
}
