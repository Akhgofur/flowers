import { beforeEach, describe, expect, it } from "vitest";
import {
  CART_STORAGE_KEY,
  FAVORITES_STORAGE_KEY,
  readCart,
  readFavorites,
  writeCart,
} from "./cart-storage";

const LEGACY_CART_KEY = "nafis.cart.v1";
const LEGACY_FAVORITES_KEY = "nafis.favorites.v1";

beforeEach(() => {
  localStorage.clear();
});

describe("pre-rebrand storage migration", () => {
  it("uses Floraluxe-branded storage keys", () => {
    expect(CART_STORAGE_KEY).toBe("floraluxe.cart.v1");
    expect(FAVORITES_STORAGE_KEY).toBe("floraluxe.favorites.v1");
  });

  // A returning visitor must not silently lose the cart they left in the browser.
  it("carries a legacy cart over to the new key and drops the old one", () => {
    localStorage.setItem(
      LEGACY_CART_KEY,
      JSON.stringify([{ productId: "roses", quantity: 3 }])
    );

    expect(readCart()).toEqual([{ productId: "roses", quantity: 3 }]);
    expect(localStorage.getItem(LEGACY_CART_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)!)).toEqual([
      { productId: "roses", quantity: 3 },
    ]);
  });

  it("carries legacy favorites over to the new key", () => {
    localStorage.setItem(LEGACY_FAVORITES_KEY, JSON.stringify(["roses", "peony"]));

    expect(readFavorites()).toEqual(["roses", "peony"]);
    expect(localStorage.getItem(LEGACY_FAVORITES_KEY)).toBeNull();
  });

  it("prefers an existing Floraluxe cart over a stale legacy cart", () => {
    localStorage.setItem(
      LEGACY_CART_KEY,
      JSON.stringify([{ productId: "old", quantity: 9 }])
    );
    writeCart([{ productId: "current", quantity: 1 }]);

    expect(readCart()).toEqual([{ productId: "current", quantity: 1 }]);
  });

  it("still validates migrated data instead of trusting the legacy shape", () => {
    localStorage.setItem(
      LEGACY_CART_KEY,
      JSON.stringify([
        { productId: "roses", quantity: 2 },
        { productId: "broken", quantity: -4 },
        "not-a-line",
      ])
    );

    expect(readCart()).toEqual([{ productId: "roses", quantity: 2 }]);
  });

  it("returns an empty cart when neither key is present", () => {
    expect(readCart()).toEqual([]);
    expect(readFavorites()).toEqual([]);
  });
});
