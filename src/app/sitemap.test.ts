import { beforeEach, describe, expect, it, vi } from "vitest";

const catalogService = vi.hoisted(() => ({
  getPublishedSitemapEntries: vi.fn(),
}));

vi.mock("@/lib/services/catalog-service", () => catalogService);

import sitemap from "./sitemap";

describe("sitemap", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://shop.nafis.uz";
    catalogService.getPublishedSitemapEntries.mockResolvedValue({
      products: [
        {
          slug: "qirmizi-atirgul-buketi",
          updatedAt: new Date("2026-08-11T00:00:00.000Z"),
        },
      ],
      categories: [
        { slug: "roses", updatedAt: new Date("2026-08-10T00:00:00.000Z") },
      ],
    });
  });

  it("includes only public catalog routes, categories, and products", async () => {
    const entries = await sitemap();

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: "https://shop.nafis.uz/" }),
        expect.objectContaining({ url: "https://shop.nafis.uz/gullar" }),
        expect.objectContaining({ url: "https://shop.nafis.uz/gullar?category=roses" }),
        expect.objectContaining({
          url: "https://shop.nafis.uz/gullar/qirmizi-atirgul-buketi",
          lastModified: new Date("2026-08-11T00:00:00.000Z"),
        }),
      ])
    );
    expect(entries.some((entry) => entry.url.includes("/admin/"))).toBe(false);
    expect(entries.some((entry) => entry.url.includes("/api/"))).toBe(false);
  });
});
