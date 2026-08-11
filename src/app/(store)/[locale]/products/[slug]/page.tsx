import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PRODUCTS } from "@/data/catalog";
import { ProductDetail } from "@/components/storefront/ProductDetail";
import { toBootstrapCatalogProduct } from "@/components/storefront/storefront-mappers";
import type { CatalogProduct } from "@/lib/contracts";
import type { Locale } from "@/i18n/config";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { getPublishedProductBySlug } from "@/lib/services/catalog-service";
import { getPublicSiteSettings } from "@/lib/services/public-settings-service";
import {
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
  buildProductMetadata,
  serializeJsonLd,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

async function loadProduct(locale: Locale, slug: string): Promise<CatalogProduct | null> {
  try {
    return await getPublishedProductBySlug(locale, slug);
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;

    const sourceProduct = PRODUCTS.find((product) => product.id === slug);
    return sourceProduct
      ? toBootstrapCatalogProduct(sourceProduct, PRODUCTS.indexOf(sourceProduct), locale)
      : null;
  }
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { locale: candidate, slug } = await params;
  const locale = isLocale(candidate) ? candidate : DEFAULT_LOCALE;
  const [product, t] = await Promise.all([
    loadProduct(locale, slug),
    getTranslations({ locale, namespace: "Metadata" }),
  ]);

  if (!product) {
    return {
      title: t("notFoundTitle"),
      robots: { index: false, follow: false },
    };
  }

  return buildProductMetadata(
    product,
    locale,
    await getPublicSiteSettings(locale)
  );
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { locale: candidate, slug } = await params;
  const locale = isLocale(candidate) ? candidate : DEFAULT_LOCALE;
  const product = await loadProduct(locale, slug);

  if (!product) notFound();

  const [settings, tHeader] = await Promise.all([
    getPublicSiteSettings(locale),
    getTranslations({ locale, namespace: "Header" }),
  ]);
  const productJsonLd = serializeJsonLd(
    buildProductJsonLd(product, locale, settings)
  );
  const breadcrumbJsonLd = serializeJsonLd(
    buildBreadcrumbJsonLd([
      { name: tHeader("navHome"), path: `/${locale}` },
      { name: tHeader("navCatalog"), path: `/${locale}/catalog` },
      { name: product.name, path: `/${locale}/products/${product.slug}` },
    ])
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: productJsonLd }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <ProductDetail key={product.id} product={product} />
    </>
  );
}
