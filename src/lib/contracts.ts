export const PRODUCT_STATUSES = ["draft", "published", "archived"] as const;
export const CATEGORY_STATUSES = ["published", "hidden"] as const;
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "delivering",
  "delivered",
  "cancelled",
] as const;
export const PAYMENT_METHODS = [
  "cash_on_delivery",
  "card_on_delivery",
] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export type CategoryStatus = (typeof CATEGORY_STATUSES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type ProductImage = {
  url: string;
  alt: string;
  publicId?: string;
};

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  composition: string[];
  price: number;
  originalPrice?: number;
  currency: "UZS";
  images: ProductImage[];
  categorySlug: string;
  flowerTypes: string[];
  colors: string[];
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
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  composition: string[];
  categoryId: string;
  price: number;
  originalPrice?: number;
  currency: "UZS";
  images: ProductImage[];
  flowerTypes: string[];
  colors: string[];
  stockQuantity: number;
  sortOrder: number;
  isFeatured: boolean;
  isNew: boolean;
  isOnSale: boolean;
  status: ProductStatus;
  deliveryEstimate?: string;
  size?: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: ProductImage;
  order: number;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdminOrder = {
  id: string;
  number: string;
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
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: "unpaid";
  status: OrderStatus;
  stockReleasedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminSiteSettings = {
  siteName: string;
  siteDescription: string;
  phone?: string;
  email?: string;
  address?: string;
  workingHours?: string;
  deliveryFee: number;
  deliveryPolicy?: string;
  instagramUrl?: string;
  telegramUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoOgImage?: ProductImage;
  updatedAt?: string;
};

/** Deliberately excludes operational-only values such as delivery fee. */
export type PublicSiteSettings = Pick<
  AdminSiteSettings,
  | "siteName"
  | "siteDescription"
  | "phone"
  | "email"
  | "address"
  | "workingHours"
  | "deliveryPolicy"
  | "instagramUrl"
  | "telegramUrl"
  | "seoTitle"
  | "seoDescription"
  | "seoOgImage"
>;

export const allowedOrderTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["delivering", "cancelled"],
  delivering: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};
