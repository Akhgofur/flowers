import type { Locale } from "@/i18n/config";

export const PRODUCT_STATUSES = ["draft", "published", "archived"] as const;
export const CATEGORY_STATUSES = ["published", "hidden"] as const;
export const HOME_SECTION_STATUSES = ["draft", "published"] as const;
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "delivering",
  "delivered",
  "cancelled",
] as const;
export const ORDER_NOTIFICATION_STATUSES = [
  "pending",
  "processing",
  "sent",
  "failed",
] as const;
export const PAYMENT_METHODS = [
  "cash_on_delivery",
  "card_on_delivery",
] as const;
export const SEASONS = [
  "spring",
  "summer",
  "autumn",
  "winter",
  "all_year",
] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export type CategoryStatus = (typeof CATEGORY_STATUSES)[number];
export type HomeSectionStatus = (typeof HOME_SECTION_STATUSES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type OrderNotificationStatus = (typeof ORDER_NOTIFICATION_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type Season = (typeof SEASONS)[number];
export type CurrentSeason = Exclude<Season, "all_year">;
export type ProductAvailabilityReason =
  | "available"
  | "unpublished"
  | "out_of_season";

export type ProductAvailability = {
  available: boolean;
  currentSeason: CurrentSeason;
  reason: ProductAvailabilityReason;
};

export type ProductImage = {
  url: string;
  alt: string;
  publicId?: string;
};

export type Localized<T> = Record<Locale, T>;

export type ProductTranslation = {
  name: string;
  shortDescription: string;
  description: string;
  composition: string[];
  deliveryEstimate?: string;
  size?: string;
  seoTitle?: string;
  seoDescription?: string;
};

export type CategoryTranslation = {
  name: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
};

export type SiteSettingsTranslation = {
  siteDescription: string;
  deliveryPolicy?: string;
  seoTitle?: string;
  seoDescription?: string;
};

export type HomeSectionTranslation = {
  title: string;
  description?: string;
};

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  composition: string[];
  price?: number;
  originalPrice?: number;
  currency: "UZS";
  images: ProductImage[];
  categorySlug: string;
  flowerTypes: string[];
  colors: string[];
  seasons: Season[];
  stockQuantity: number;
  sortOrder: number;
  isFeatured: boolean;
  isNew: boolean;
  isOnSale: boolean;
  deliveryEstimate?: string;
  size?: string;
  status: "published";
  seoTitle?: string;
  seoDescription?: string;
};

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: ProductImage;
  order: number;
  status: "published";
};

export type PublicCatalogFilters = {
  category?: string;
  sale?: boolean;
  favorites?: boolean;
  query?: string;
  page?: number;
  limit?: number;
};

export type NormalizedPublicCatalogFilters = {
  category?: string;
  sale: boolean;
  query?: string;
  page: number;
  limit: number;
};

export type PublicSitemapEntry = {
  slug: string;
  updatedAt: Date;
};

export type PublicSitemapEntries = {
  products: PublicSitemapEntry[];
  categories: PublicSitemapEntry[];
};

export type CheckoutInput = {
  locale: Locale;
  customer: {
    fullName: string;
    phone: string;
    address: string;
    deliveryDate?: string;
    comment?: string;
  };
  paymentMethod: PaymentMethod;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
};

export type OrderCreationResult = {
  orderId: string;
  orderNumber: string;
  total: number;
  status: "pending";
};

/** Server-only admin DTOs remain JSON-safe for client dashboard islands. */
export type AdminProduct = {
  id: string;
  slug: string;
  translations: Localized<ProductTranslation>;
  categoryId: string;
  price?: number;
  originalPrice?: number;
  currency: "UZS";
  images: ProductImage[];
  flowerTypes: string[];
  colors: string[];
  seasons: Season[];
  stockQuantity: number;
  sortOrder: number;
  isFeatured: boolean;
  isNew: boolean;
  isOnSale: boolean;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdminCategory = {
  id: string;
  slug: string;
  translations: Localized<CategoryTranslation>;
  image?: ProductImage;
  order: number;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdminOrder = {
  id: string;
  number: string;
  locale: Locale;
  customer: {
    fullName: string;
    phone: string;
    address: string;
    deliveryDate?: string;
    comment?: string;
  };
  items: Array<{
    productId: string;
    slug: string;
    name: string;
    imageUrl: string;
    unitPrice?: number;
    quantity: number;
    lineTotal?: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: "unpaid";
  status: OrderStatus;
  telegram?: {
    status: OrderNotificationStatus;
    attempts: number;
    lastErrorCode?: string;
    sentAt?: string;
  };
  stockReleasedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminSiteSettings = {
  siteName: string;
  brandLogo?: ProductImage;
  brandMark?: ProductImage;
  translations: Localized<SiteSettingsTranslation>;
  phone?: string;
  email?: string;
  address?: string;
  workingHours?: string;
  deliveryFee: number;
  instagramUrl?: string;
  telegramUrl?: string;
  seoOgImage?: ProductImage;
  updatedAt?: string;
};

export type AdminHomeSection = {
  id: string;
  translations: Localized<HomeSectionTranslation>;
  productIds: string[];
  sortOrder: number;
  status: HomeSectionStatus;
  startsAt?: string;
  endsAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicHomeSection = {
  id: string;
  title: string;
  description?: string;
  productIds: string[];
  sortOrder: number;
};

/** Deliberately excludes operational-only values such as delivery fee. */
export type PublicSiteSettings = {
  siteName: string;
  brandLogo?: ProductImage;
  brandMark?: ProductImage;
  siteDescription: string;
  phone?: string;
  email?: string;
  address?: string;
  workingHours?: string;
  deliveryPolicy?: string;
  instagramUrl?: string;
  telegramUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoOgImage?: ProductImage;
};

export const allowedOrderTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["delivering", "cancelled"],
  delivering: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};
