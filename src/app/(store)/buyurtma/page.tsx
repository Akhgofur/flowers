import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { PRODUCTS } from "@/data/catalog";
import type { CatalogProduct } from "@/lib/contracts";
import { getPublishedCatalog } from "@/lib/services/catalog-service";
import { toBootstrapCatalogProduct } from "@/components/storefront/storefront-mappers";

export const metadata: Metadata = {
  title: "Buyurtmani rasmiylashtirish",
  description: "Nafis Flowers buyurtmasini yetkazib berish uchun rasmiylashtiring.",
  alternates: { canonical: "/buyurtma" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function loadCheckoutProducts(): Promise<{
  products: CatalogProduct[];
  isDemoCatalog: boolean;
}> {
  try {
    const products = await getPublishedCatalog({ limit: 48 });
    return { products, isDemoCatalog: false };
  } catch {
    if (process.env.NODE_ENV === "production") throw new Error("Checkout catalog is unavailable.");

    return {
      products: PRODUCTS.map(toBootstrapCatalogProduct),
      isDemoCatalog: true,
    };
  }
}

export default async function CheckoutPage() {
  const { products, isDemoCatalog } = await loadCheckoutProducts();
  return <CheckoutClient products={products} isDemoCatalog={isDemoCatalog} />;
}
