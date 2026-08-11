export type CategoryId = string;

export type FlowerType = string;

export type ProductColor = string;

export type CatalogTab = "all" | "new" | "sale";

export type Product = {
  id: string;
  slug?: string;
  name: string;
  price?: number;
  originalPrice?: number;
  image: string;
  category: CategoryId;
  flowerTypes: FlowerType[];
  colors: ProductColor[];
  isNew: boolean;
  isOnSale: boolean;
  shortDescription: string;
  composition: string[];
  deliveryEstimate: string;
  size: string;
};

export type CartLine = { productId: Product["id"]; quantity: number };

export type CatalogFilters = {
  query: string;
  category: CategoryId | null;
  flowerTypes: FlowerType[];
  colors: ProductColor[];
  minPrice: number;
  maxPrice: number;
  tab: CatalogTab;
};

export type Category = {
  id: CategoryId;
  title: string;
  productCount: number;
  image: string;
  icon: "rose" | "tulip" | "bouquet" | "orchid" | "gift" | "wedding";
};

export type HeroSlideConfig = Pick<HeroSlide, "id" | "ctaTarget" | "image">;

export type HeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaTarget: "#catalog" | "#sale" | "#gift";
  image: string;
};
