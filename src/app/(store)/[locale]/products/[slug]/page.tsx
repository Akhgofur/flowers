import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PRODUCTS } from "@/data/catalog";
import { ProductDetail } from "@/components/storefront/ProductDetail";
import { toBootstrapCatalogProduct } from "@/components/storefront/storefront-mappers";
import type { CatalogProduct } from "@/lib/contracts";
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

async function loadProduct(slug: string): Promise<CatalogProduct | null> {
  try {
    return await getPublishedProductBySlug(slug);
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;

    const sourceProduct = PRODUCTS.find((product) => product.id === slug);
    return sourceProduct
      ? toBootstrapCatalogProduct(sourceProduct, PRODUCTS.indexOf(sourceProduct))
      : null;
  }
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (!product) {
    return {
      title: "Mahsulot topilmadi",
      robots: { index: false, follow: false },
    };
  }

  return buildProductMetadata(product, await getPublicSiteSettings());
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { locale, slug } = await params;
  const product = await loadProduct(slug);

  if (!product) notFound();

  const productJsonLd = serializeJsonLd(
    buildProductJsonLd(product, await getPublicSiteSettings())
  );
  const breadcrumbJsonLd = serializeJsonLd(
    buildBreadcrumbJsonLd([
      { name: "Bosh sahifa", path: `/${locale}` },
      { name: "Gullar", path: `/${locale}/catalog` },
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
