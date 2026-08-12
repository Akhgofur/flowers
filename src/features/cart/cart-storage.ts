import type { CartLine } from "../../shared/types";

export const CART_STORAGE_KEY = "floraluxe.cart.v1";
export const FAVORITES_STORAGE_KEY = "floraluxe.favorites.v1";

/**
 * Keys written before the Floraluxe rebrand. Returning visitors still carry them,
 * so a read falls back to the retired key once and rewrites under the new name.
 */
const LEGACY_KEYS: Readonly<Record<string, string>> = {
  [CART_STORAGE_KEY]: "nafis.cart.v1",
  [FAVORITES_STORAGE_KEY]: "nafis.favorites.v1",
};

const MAX_CART_QUANTITY = 99;

const getStorage = (): Storage | null => {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

const parseArray = (raw: string | null): unknown[] => {
  try {
    const parsed: unknown = JSON.parse(raw ?? "null");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const readJsonArray = (key: string): unknown[] => {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  // Privacy modes can make any storage method throw, so every access is guarded.
  try {
    const current = storage.getItem(key);
    if (current !== null) {
      return parseArray(current);
    }

    const legacyKey = LEGACY_KEYS[key];
    if (!legacyKey) {
      return [];
    }

    const legacy = storage.getItem(legacyKey);
    if (legacy === null) {
      return [];
    }

    const migrated = parseArray(legacy);
    try {
      storage.setItem(key, JSON.stringify(migrated));
      storage.removeItem(legacyKey);
    } catch {
      // A failed rewrite is not fatal: the value was still read for this session.
    }

    return migrated;
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
