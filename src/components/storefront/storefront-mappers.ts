import type { CatalogCategory, CatalogProduct } from "@/lib/contracts";
import type { Locale } from "@/i18n/config";
import type { BootstrapCategory, BootstrapProduct } from "@/data/catalog";
import { IMAGE_FALLBACK_URL } from "@/shared/image-fallback";
import type { Category, Product } from "@/shared/types";
import { getProductAvailability } from "@/lib/product-availability";

const CATEGORY_ICONS: Record<string, Category["icon"]> = {
  roses: "rose",
  tulips: "tulip",
  mixed: "bouquet",
  orchids: "orchid",
  boxed: "gift",
  wedding: "wedding",
};

export function toClientProduct(product: CatalogProduct): Product {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    ...(product.originalPrice === undefined
      ? {}
      : { originalPrice: product.originalPrice }),
    image: product.images[0]?.url ?? IMAGE_FALLBACK_URL,
    category: product.categorySlug,
    flowerTypes: [...product.flowerTypes],
    colors: [...product.colors],
    isNew: product.isNew,
    isOnSale: product.isOnSale,
    shortDescription: product.shortDescription,
    composition: [...product.composition],
    deliveryEstimate: product.deliveryEstimate ?? "",
    size: product.size ?? "",
    availability: getProductAvailability(product, new Date()),
  };
}

export function toClientCategory(
  category: CatalogCategory,
  products: readonly CatalogProduct[]
): Category {
  const productCount = products.filter(
    (product) => product.categorySlug === category.slug
  ).length;

  return {
    id: category.slug,
    title: category.name,
    productCount,
    image: category.image?.url ?? IMAGE_FALLBACK_URL,
    icon: CATEGORY_ICONS[category.slug] ?? "bouquet",
  };
}

export function toBootstrapCatalogProduct(
  product: BootstrapProduct,
  index: number,
  locale: Locale
): CatalogProduct {
  const translation = product.translations[locale];

  return {
    id: product.id,
    name: translation.name,
    slug: product.slug ?? product.id,
    shortDescription: translation.shortDescription,
    description: translation.description,
    composition: [...translation.composition],
    price: product.price,
    ...(product.originalPrice === undefined
      ? {}
      : { originalPrice: product.originalPrice }),
    currency: "UZS",
    images: [
      {
        url: product.image,
        alt: translation.name,
      },
    ],
    categorySlug: product.category,
    flowerTypes: [...product.flowerTypes],
    colors: [...product.colors],
    seasons: ["all_year"],
    sortOrder: index,
    isFeatured: index < 4,
    isNew: product.isNew,
    isOnSale: product.isOnSale,
    ...(translation.deliveryEstimate
      ? { deliveryEstimate: translation.deliveryEstimate }
      : {}),
    ...(translation.size ? { size: translation.size } : {}),
    ...(translation.seoTitle ? { seoTitle: translation.seoTitle } : {}),
    ...(translation.seoDescription
      ? { seoDescription: translation.seoDescription }
      : {}),
    status: "published",
  };
}

export function toBootstrapCatalogCategory(
  category: BootstrapCategory,
  index: number,
  locale: Locale
): CatalogCategory {
  const translation = category.translations[locale];

  return {
    id: category.id,
    name: translation.name,
    slug: category.id,
    image: {
      url: category.image,
      alt: translation.name,
    },
    order: index,
    status: "published",
    ...(translation.description ? { description: translation.description } : {}),
  };
}
