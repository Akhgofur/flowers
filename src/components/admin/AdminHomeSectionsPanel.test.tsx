import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AdminProduct } from "@/lib/contracts";
import { AdminHomeSectionsPanel } from "./AdminHomeSectionsPanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const product = (id: string, name: string): AdminProduct => ({
  id,
  slug: name.toLowerCase().replaceAll(" ", "-"),
  translations: {
    ru: { name, shortDescription: name, description: name, composition: [name] },
    uz: { name, shortDescription: name, description: name, composition: [name] },
    en: { name, shortDescription: name, description: name, composition: [name] },
  },
  categoryId: "507f1f77bcf86cd799439010",
  price: 100_000,
  currency: "UZS",
  images: [{ url: "https://example.com/flower.jpg", alt: name }],
  flowerTypes: ["rose"],
  colors: ["pink"],
  seasons: ["all_year"],
  sortOrder: 0,
  isFeatured: false,
  isNew: false,
  isOnSale: false,
  status: "published",
  createdAt: "2026-08-11T00:00:00.000Z",
  updatedAt: "2026-08-11T00:00:00.000Z",
});

describe("AdminHomeSectionsPanel", () => {
  it("creates a localized published section with ordered products", async () => {
    const user = userEvent.setup();
    const roses = product("507f1f77bcf86cd799439011", "Rose basket");
    const peonies = product("507f1f77bcf86cd799439012", "Peony bouquet");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        section: {
          id: "507f1f77bcf86cd799439099",
          translations: {
            ru: { title: "Топ цветов" },
            uz: { title: "Top gullar" },
            en: { title: "Top flowers" },
          },
          productIds: [peonies.id, roses.id],
          sortOrder: 0,
          status: "published",
          createdAt: "2026-08-11T00:00:00.000Z",
          updatedAt: "2026-08-11T00:00:00.000Z",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminHomeSectionsPanel initialSections={[]} products={[roses, peonies]} />);

    await user.click(screen.getByRole("button", { name: /bo.lim yaratish/i }));
    await user.type(screen.getByLabelText(/bo.lim sarlavhasi/i), "Топ цветов");
    await user.click(screen.getByRole("button", { name: "O‘zbekcha" }));
    await user.type(screen.getByLabelText(/bo.lim sarlavhasi/i), "Top gullar");
    await user.click(screen.getByRole("button", { name: "English" }));
    await user.type(screen.getByLabelText(/bo.lim sarlavhasi/i), "Top flowers");
    await user.type(screen.getByLabelText("Mahsulot qidirish"), "bouquet");
    await user.click(screen.getByRole("button", { name: "Peony bouquetni qo'shish" }));
    await user.clear(screen.getByLabelText("Mahsulot qidirish"));
    await user.type(screen.getByLabelText("Mahsulot qidirish"), "basket");
    await user.click(screen.getByRole("button", { name: "Rose basketni qo'shish" }));
    await user.selectOptions(screen.getByLabelText(/bo.lim holati/i), "published");
    await user.click(screen.getByRole("button", { name: /bo.limni saqlash/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/home-sections", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        translations: {
          ru: { title: "Топ цветов" },
          uz: { title: "Top gullar" },
          en: { title: "Top flowers" },
        },
        productIds: [peonies.id, roses.id],
        sortOrder: 0,
        status: "published",
      }),
    }));
    vi.unstubAllGlobals();
  });
});
