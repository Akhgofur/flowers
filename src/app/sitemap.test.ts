import { beforeEach, describe, expect, it, vi } from "vitest";

const catalogService = vi.hoisted(() => ({
  getPublishedSitemapEntries: vi.fn(),
}));

vi.mock("@/lib/services/catalog-service", () => catalogService);

import sitemap from "./sitemap";

describe("sitemap", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://shop.floraluxe.uz";
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

  it("includes locale-specific canonical pages with complete alternates only", async () => {
    const entries = await sitemap();

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: "https://shop.floraluxe.uz/ru" }),
        expect.objectContaining({ url: "https://shop.floraluxe.uz/uz/catalog" }),
        expect.objectContaining({
          url: "https://shop.floraluxe.uz/en/products/qirmizi-atirgul-buketi",
          lastModified: new Date("2026-08-11T00:00:00.000Z"),
          alternates: {
            languages: {
              "ru-RU":
                "https://shop.floraluxe.uz/ru/products/qirmizi-atirgul-buketi",
              "uz-UZ":
                "https://shop.floraluxe.uz/uz/products/qirmizi-atirgul-buketi",
              en: "https://shop.floraluxe.uz/en/products/qirmizi-atirgul-buketi",
              "x-default":
                "https://shop.floraluxe.uz/ru/products/qirmizi-atirgul-buketi",
            },
          },
        }),
      ])
    );
    expect(entries).toHaveLength(9);
    expect(entries.some((entry) => entry.url.includes("/admin/"))).toBe(false);
    expect(entries.some((entry) => entry.url.includes("/api/"))).toBe(false);
    expect(entries.some((entry) => entry.url.includes("/gullar"))).toBe(false);
    expect(entries.some((entry) => entry.url.includes("/buyurtma"))).toBe(false);
    expect(entries.some((entry) => entry.url.includes("?"))).toBe(false);
  });
});
