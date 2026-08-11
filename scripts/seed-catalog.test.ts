import { describe, expect, it, vi } from "vitest";
import { seedCatalog, type CatalogSeedStore } from "./seed-catalog";

function createStore(created: boolean): CatalogSeedStore {
  let categorySequence = 0;

  return {
    connect: vi.fn().mockResolvedValue(undefined),
    upsertCategory: vi.fn().mockImplementation(async () => {
      categorySequence += 1;
      return { id: `category-${categorySequence}`, created };
    }),
    upsertProduct: vi.fn().mockResolvedValue({ created }),
  };
}

describe("catalog seed", () => {
  it("upserts the full source catalog without an import side effect", async () => {
    const store = createStore(true);

    const summary = await seedCatalog(store);

    expect(store.connect).toHaveBeenCalledTimes(1);
    expect(store.upsertCategory).toHaveBeenCalledTimes(6);
    expect(store.upsertProduct).toHaveBeenCalledTimes(12);
    expect(summary).toEqual({
      categories: { created: 6, updated: 0 },
      products: { created: 12, updated: 0 },
    });
  });

  it("reports updates when the same source catalog is seeded again", async () => {
    const store = createStore(false);

    await expect(seedCatalog(store)).resolves.toEqual({
      categories: { created: 0, updated: 6 },
      products: { created: 0, updated: 12 },
    });
  });
});
