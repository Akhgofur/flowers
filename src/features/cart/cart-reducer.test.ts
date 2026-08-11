import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addToCart,
  removeFromCart,
  setCartQuantity,
} from "./cart-reducer";
import {
  CART_STORAGE_KEY,
  FAVORITES_STORAGE_KEY,
  readCart,
  readFavorites,
  writeCart,
  writeFavorites,
} from "./cart-storage";

describe("cart reducer", () => {
  it("merges repeated adds and removes a line at quantity zero", () => {
    expect(addToCart([{ productId: "pink-peony", quantity: 1 }], "pink-peony", 2)).toEqual([
      { productId: "pink-peony", quantity: 3 },
    ]);
    expect(setCartQuantity([{ productId: "pink-peony", quantity: 1 }], "pink-peony", 0)).toEqual([]);
  });

  it("caps a repeated add at 99", () => {
    expect(addToCart([{ productId: "pink-peony", quantity: 98 }], "pink-peony", 3)).toEqual([
      { productId: "pink-peony", quantity: 99 },
    ]);
  });

  it("caps an oversized first add at 99", () => {
    expect(addToCart([], "pink-peony", 100)).toEqual([
      { productId: "pink-peony", quantity: 99 },
    ]);
  });

  it("leaves the input cart and its line objects untouched", () => {
    const initial = [{ productId: "pink-peony", quantity: 1 }];
    const result = addToCart(initial, "pink-peony", 2);

    expect(initial).toEqual([{ productId: "pink-peony", quantity: 1 }]);
    expect(result).not.toBe(initial);
    expect(result[0]).not.toBe(initial[0]);
  });

  it("returns a fresh cart when a removal finds no matching product", () => {
    const initial = [{ productId: "pink-peony", quantity: 1 }];
    const result = removeFromCart(initial, "white-orchid");

    expect(result).toEqual(initial);
    expect(result).not.toBe(initial);
    expect(result[0]).not.toBe(initial[0]);
  });

  it("removes only the first matching line", () => {
    expect(
      removeFromCart(
        [
          { productId: "pink-peony", quantity: 1 },
          { productId: "pink-peony", quantity: 2 },
        ],
        "pink-peony",
      ),
    ).toEqual([{ productId: "pink-peony", quantity: 2 }]);
  });
});

describe("cart browser storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("ignores malformed browser storage", () => {
    localStorage.setItem(CART_STORAGE_KEY, "{not-json");

    expect(readCart(new Set(["pink-peony"]))).toEqual([]);
  });

  it("filters invalid cart storage and merges duplicates in first-seen order", () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        { productId: "pink-peony", quantity: 2 },
        { productId: "stale", quantity: 4 },
        { productId: "white-orchid", quantity: 100 },
        { productId: "pink-peony", quantity: 98 },
        { productId: "pink-peony", quantity: 1.5 },
        { productId: "white-orchid", quantity: 1 },
        "wrong-shape",
      ]),
    );

    expect(readCart(new Set(["pink-peony", "white-orchid"]))).toEqual([
      { productId: "pink-peony", quantity: 99 },
      { productId: "white-orchid", quantity: 1 },
    ]);
  });

  it("rejects individually invalid stored quantities but caps valid duplicate totals", () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        { productId: "pink-peony", quantity: 0 },
        { productId: "pink-peony", quantity: 100 },
        { productId: "pink-peony", quantity: -1 },
        { productId: "pink-peony", quantity: 60 },
        { productId: "pink-peony", quantity: 50 },
      ]),
    );

    expect(readCart(new Set(["pink-peony"]))).toEqual([
      { productId: "pink-peony", quantity: 99 },
    ]);
  });

  it("returns an empty cart for a non-array JSON root", () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ productId: "pink-peony", quantity: 2 }));

    expect(readCart(new Set(["pink-peony"]))).toEqual([]);
  });

  it("deduplicates favorites and removes stale ids", () => {
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(["pink-peony", "stale", "pink-peony", 12, "white-orchid"]),
    );

    expect(readFavorites(new Set(["pink-peony", "white-orchid"]))).toEqual([
      "pink-peony",
      "white-orchid",
    ]);
  });

  it("round trips cart and favorites through jsdom storage", () => {
    writeCart([{ productId: "pink-peony", quantity: 2 }]);
    writeFavorites(["pink-peony"]);

    expect(readCart(new Set(["pink-peony"]))).toEqual([{ productId: "pink-peony", quantity: 2 }]);
    expect(readFavorites(new Set(["pink-peony"]))).toEqual(["pink-peony"]);
  });

  it("returns empty reads and swallows writes when storage methods throw", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });

    try {
      expect(readCart(new Set(["pink-peony"]))).toEqual([]);
      expect(readFavorites(new Set(["pink-peony"]))).toEqual([]);
      expect(() => writeCart([{ productId: "pink-peony", quantity: 1 }])).not.toThrow();
      expect(() => writeFavorites(["pink-peony"])).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("returns empty reads and swallows writes when localStorage is unavailable", () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get: () => {
        throw new Error("unavailable");
      },
    });

    try {
      expect(readCart(new Set(["pink-peony"]))).toEqual([]);
      expect(readFavorites(new Set(["pink-peony"]))).toEqual([]);
      expect(() => writeCart([{ productId: "pink-peony", quantity: 1 }])).not.toThrow();
      expect(() => writeFavorites(["pink-peony"])).not.toThrow();
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(globalThis, "localStorage", originalDescriptor);
      } else {
        delete (globalThis as { localStorage?: Storage }).localStorage;
      }
    }
  });
});
