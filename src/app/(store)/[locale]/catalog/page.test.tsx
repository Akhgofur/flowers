import { describe, expect, it, vi } from "vitest";

const storefront = vi.hoisted(() => ({
  StorefrontShell: vi.fn(async () => null),
}));

vi.mock("@/components/storefront/StorefrontShell", () => storefront);

import CatalogPage from "./page";

describe("catalog server route", () => {
  it("passes the favorites query to the browser catalog", async () => {
    await CatalogPage({
      params: Promise.resolve({ locale: "ru" }),
      searchParams: Promise.resolve({ favorites: "true" }),
    });

    expect(storefront.StorefrontShell).toHaveBeenCalledWith({
      locale: "ru",
      filters: { favorites: true },
    });
  });
});
