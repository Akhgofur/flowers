import type { CatalogCategory, CatalogProduct } from "@/lib/contracts";
import { IMAGE_FALLBACK_URL } from "@/shared/image-fallback";
import type { Category, Product } from "@/shared/types";

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
    deliveryEstimate: product.deliveryEstimate ?? "Yetkazib berish aniqlashtiriladi",
    size: product.size ?? "O‘lchami aniqlashtiriladi",
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
    productCountLabel: `${productCount} ta tanlov`,
    image: category.image?.url ?? IMAGE_FALLBACK_URL,
    icon: CATEGORY_ICONS[category.slug] ?? "bouquet",
  };
}

export function toBootstrapCatalogProduct(
  product: Product,
  index: number
): CatalogProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug ?? product.id,
    shortDescription: product.shortDescription,
    description: `${product.shortDescription} Tarkibi: ${product.composition.join(
      ", "
    )}.`,
    composition: [...product.composition],
    price: product.price,
    ...(product.originalPrice === undefined
      ? {}
      : { originalPrice: product.originalPrice }),
    currency: "UZS",
    images: [
      {
        url: product.image,
        alt: `${product.name} gul kompozitsiyasi`,
      },
    ],
    categorySlug: product.category,
    flowerTypes: [...product.flowerTypes],
    colors: [...product.colors],
    stockQuantity: 20,
    sortOrder: index,
    isFeatured: index < 4,
    isNew: product.isNew,
    isOnSale: product.isOnSale,
    deliveryEstimate: product.deliveryEstimate,
    size: product.size,
    status: "published",
  };
}

export function toBootstrapCatalogCategory(
  category: Category,
  index: number
): CatalogCategory {
  return {
    id: category.id,
    name: category.title,
    slug: category.id,
    image: {
      url: category.image,
      alt: `${category.title} uchun gul kompozitsiyasi`,
    },
    order: index,
    status: "published",
  };
}
