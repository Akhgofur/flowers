import { beforeEach, describe, expect, it, vi } from "vitest";

const catalogService = vi.hoisted(() => ({
  getEntirePublishedCatalog: vi.fn(async () => ({
    products: [],
    truncated: false,
  })),
}));

vi.mock("@/lib/services/catalog-service", () => catalogService);

import CheckoutPage from "./page";

describe("checkout server route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Checkout reconciles the browser cart against this list, so a capped page
  // would silently drop a shopper's line as the catalog grows.
  it("loads the entire published catalog, not a single capped page", async () => {
    catalogService.getEntirePublishedCatalog.mockResolvedValueOnce({
      products: [],
      truncated: false,
    });

    await CheckoutPage({ params: Promise.resolve({ locale: "ru" }) });

    expect(catalogService.getEntirePublishedCatalog).toHaveBeenCalledWith("ru");
  });

  it("passes catalog truncation down so the cart is not pruned on partial data", async () => {
    catalogService.getEntirePublishedCatalog.mockResolvedValueOnce({
      products: [],
      truncated: true,
    });

    const element = (await CheckoutPage({
      params: Promise.resolve({ locale: "ru" }),
    })) as { props: { catalogTruncated: boolean; isDemoCatalog: boolean } };

    expect(element.props.catalogTruncated).toBe(true);
    expect(element.props.isDemoCatalog).toBe(false);
  });
});
