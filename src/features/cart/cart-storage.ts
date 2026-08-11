import type { CartLine } from "../../shared/types";

export const CART_STORAGE_KEY = "nafis.cart.v1";
export const FAVORITES_STORAGE_KEY = "nafis.favorites.v1";

const MAX_CART_QUANTITY = 99;

const getStorage = (): Storage | null => {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

const readJsonArray = (key: string): unknown[] => {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(storage.getItem(key) ?? "null");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const isCartLine = (value: unknown): value is CartLine => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const { productId, quantity } = value as Record<string, unknown>;
  return (
    typeof productId === "string" &&
    typeof quantity === "number" &&
    Number.isInteger(quantity) &&
    quantity > 0 &&
    quantity <= MAX_CART_QUANTITY
  );
};

export function readCart(validProductIds?: ReadonlySet<string>): CartLine[] {
  const quantities = new Map<string, number>();

  for (const value of readJsonArray(CART_STORAGE_KEY)) {
    if (
      !isCartLine(value) ||
      (validProductIds !== undefined && !validProductIds.has(value.productId))
    ) {
      continue;
    }

    quantities.set(
      value.productId,
      Math.min(MAX_CART_QUANTITY, (quantities.get(value.productId) ?? 0) + value.quantity),
    );
  }

  return [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
}

export function writeCart(lines: readonly CartLine[]): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Browser privacy settings or storage quota failures should not block the UI.
  }
}

export function readFavorites(validProductIds?: ReadonlySet<string>): string[] {
  const ids = new Set<string>();

  for (const value of readJsonArray(FAVORITES_STORAGE_KEY)) {
    if (
      typeof value === "string" &&
      (validProductIds === undefined || validProductIds.has(value))
    ) {
      ids.add(value);
    }
  }

  return [...ids];
}

export function writeFavorites(ids: readonly string[]): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Browser privacy settings or storage quota failures should not block the UI.
  }
}
