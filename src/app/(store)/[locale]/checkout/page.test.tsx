import { describe, expect, it, vi } from "vitest";

const catalogService = vi.hoisted(() => ({
  getPublishedCatalog: vi.fn(async () => []),
}));

vi.mock("@/lib/services/catalog-service", () => catalogService);

import CheckoutPage from "./page";

describe("checkout server route", () => {
  it("loads every product that can be added from the public catalog", async () => {
    await CheckoutPage({
      params: Promise.resolve({ locale: "ru" }),
    });

    expect(catalogService.getPublishedCatalog).toHaveBeenCalledWith("ru", {
      page: 1,
      limit: 200,
    });
  });
});
