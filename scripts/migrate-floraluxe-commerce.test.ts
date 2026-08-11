import { describe, expect, it, vi } from "vitest";
import {
  migrateFloraluxeCommerce,
  type FloraluxeMigrationStore,
} from "./migrate-floraluxe-commerce";

function createStore() {
  const state = {
    products: [
      { seasons: undefined as string[] | undefined },
      { seasons: [] as string[] },
      { seasons: ["spring"] },
    ],
    siteName: "Nafis",
  };

  const store: FloraluxeMigrationStore = {
    connect: vi.fn().mockResolvedValue(undefined),
    inspect: vi.fn().mockImplementation(async () => ({
      productsMissingSeasons: state.products.filter(
        (product) => !product.seasons?.length
      ).length,
      legacySiteName: ["", "Nafis", "Nafis Flowers"].includes(state.siteName),
    })),
    apply: vi.fn().mockImplementation(async () => {
      let productsUpdated = 0;
      for (const product of state.products) {
        if (!product.seasons?.length) {
          product.seasons = ["all_year"];
          productsUpdated += 1;
        }
      }

      const settingsUpdated = ["", "Nafis", "Nafis Flowers"].includes(
        state.siteName
      )
        ? 1
        : 0;
      if (settingsUpdated) state.siteName = "Floraluxe";

      return { productsUpdated, settingsUpdated };
    }),
  };

  return { state, store };
}

describe("Floraluxe commerce migration", () => {
  it("reports the exact dry-run without writing", async () => {
    const { state, store } = createStore();

    await expect(
      migrateFloraluxeCommerce({ dryRun: true, store })
    ).resolves.toEqual({
      dryRun: true,
      productsUpdated: 2,
      settingsUpdated: 1,
    });

    expect(store.apply).not.toHaveBeenCalled();
    expect(state.products[0].seasons).toBeUndefined();
    expect(state.siteName).toBe("Nafis");
  });

  it("is idempotent and preserves existing season assignments", async () => {
    const { state, store } = createStore();

    await expect(
      migrateFloraluxeCommerce({ dryRun: false, store })
    ).resolves.toEqual({
      dryRun: false,
      productsUpdated: 2,
      settingsUpdated: 1,
    });
    await expect(
      migrateFloraluxeCommerce({ dryRun: false, store })
    ).resolves.toEqual({
      dryRun: false,
      productsUpdated: 0,
      settingsUpdated: 0,
    });

    expect(state.products.map((product) => product.seasons)).toEqual([
      ["all_year"],
      ["all_year"],
      ["spring"],
    ]);
    expect(state.siteName).toBe("Floraluxe");
  });

  it("does not overwrite a custom administrator-owned brand name", async () => {
    const { state, store } = createStore();
    state.siteName = "Custom Florist";

    await expect(
      migrateFloraluxeCommerce({ dryRun: true, store })
    ).resolves.toMatchObject({ settingsUpdated: 0 });
  });
});
