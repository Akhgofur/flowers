import type {
  CurrentSeason,
  ProductAvailability,
  ProductStatus,
  Season,
} from "@/lib/contracts";

export type ProductAvailabilityInput = {
  status: ProductStatus;
  seasons: readonly Season[];
  stockQuantity: number;
  price?: number;
};

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tashkent",
  month: "numeric",
});

export function getTashkentSeason(now: Date): CurrentSeason {
  const month = Number(monthFormatter.format(now));

  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

export function isSeasonActive(seasons: readonly Season[], now: Date): boolean {
  return seasons.includes("all_year") || seasons.includes(getTashkentSeason(now));
}

export function getProductAvailability(
  product: ProductAvailabilityInput,
  now: Date
): ProductAvailability {
  const currentSeason = getTashkentSeason(now);

  if (product.status !== "published") {
    return { available: false, currentSeason, reason: "unpublished" };
  }
  if (!isSeasonActive(product.seasons, now)) {
    return { available: false, currentSeason, reason: "out_of_season" };
  }
  if (product.stockQuantity <= 0) {
    return { available: false, currentSeason, reason: "out_of_stock" };
  }
  if (!Number.isSafeInteger(product.price) || (product.price ?? 0) <= 0) {
    return { available: false, currentSeason, reason: "price_missing" };
  }

  return { available: true, currentSeason, reason: "available" };
}
