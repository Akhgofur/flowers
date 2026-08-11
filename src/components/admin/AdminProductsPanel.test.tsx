import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AdminCategory, AdminProduct } from "@/lib/contracts";
import { AdminProductsPanel } from "./AdminProductsPanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const category: AdminCategory = {
  id: "507f1f77bcf86cd799439011",
  slug: "roses",
  translations: {
    ru: { name: "Розы" },
    uz: { name: "Atirgullar" },
    en: { name: "Roses" },
  },
  order: 0,
  status: "published",
  createdAt: "2026-08-11T00:00:00.000Z",
  updatedAt: "2026-08-11T00:00:00.000Z",
};

const product: AdminProduct = {
  id: "507f1f77bcf86cd799439012",
  slug: "rose-basket",
  translations: {
    ru: { name: "Корзина роз", shortDescription: "Розы", description: "Розы в корзине", composition: ["Розы"] },
    uz: { name: "Atirgul savati", shortDescription: "Atirgullar", description: "Savatdagi atirgullar", composition: ["Atirgullar"] },
    en: { name: "Rose basket", shortDescription: "Roses", description: "Roses in a basket", composition: ["Roses"] },
  },
  categoryId: category.id,
  price: 500_000,
  currency: "UZS",
  images: [{ url: "https://example.com/rose.jpg", alt: "Rose basket" }],
  flowerTypes: ["rose"],
  colors: ["red"],
  seasons: ["all_year"],
  stockQuantity: 4,
  sortOrder: 1,
  isFeatured: false,
  isNew: false,
  isOnSale: false,
  status: "published",
  createdAt: "2026-08-11T00:00:00.000Z",
  updatedAt: "2026-08-11T00:00:00.000Z",
};

describe("AdminProductsPanel locale drafts", () => {
  it("keeps product names isolated across all three locale tabs", async () => {
    const user = userEvent.setup();
    render(<AdminProductsPanel initialProducts={[]} categories={[category]} />);

    await user.click(screen.getByRole("button", { name: /mahsulot qo‘shish/i }));
    expect(screen.getByRole("button", { name: "Русский" })).toBeVisible();
    expect(screen.getByRole("button", { name: "O‘zbekcha" })).toBeVisible();
    expect(screen.getByRole("button", { name: "English" })).toBeVisible();

    await user.type(screen.getByLabelText("Mahsulot nomi"), "Букет алых роз");
    await user.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByLabelText("Mahsulot nomi")).toHaveValue("");
    await user.type(screen.getByLabelText("Mahsulot nomi"), "Scarlet rose bouquet");
    await user.click(screen.getByRole("button", { name: "Русский" }));
    expect(screen.getByLabelText("Mahsulot nomi")).toHaveValue("Букет алых роз");
  });

  it("edits a product in its table row instead of opening the full editor", async () => {
    const user = userEvent.setup();
    render(<AdminProductsPanel initialProducts={[product]} categories={[category]} />);

    await user.click(screen.getByRole("button", { name: /tahrirlash/i }));

    expect(screen.getByRole("textbox", { name: /mahsulot nomi/i })).toHaveValue("Корзина роз");
    expect(screen.queryByRole("heading", { name: /mahsulotni yangilash/i })).not.toBeInTheDocument();
  });

  it("sends only the changed inline field on save", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ product }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminProductsPanel initialProducts={[product]} categories={[category]} />);

    await user.click(screen.getByRole("button", { name: /tahrirlash/i }));
    const name = screen.getByRole("textbox", { name: /mahsulot nomi/i });
    await user.clear(name);
    await user.type(name, "Новая корзина роз");
    await user.click(screen.getByRole("button", { name: /saqlash/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/products/${product.id}`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ translations: { ru: { name: "Новая корзина роз" } } }),
      })
    );
    vi.unstubAllGlobals();
  });

  it("shows an inline error instead of sending an invalid price", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminProductsPanel initialProducts={[product]} categories={[category]} />);

    await user.click(screen.getByRole("button", { name: /tahrirlash/i }));
    const price = screen.getByRole("textbox", { name: /narx/i });
    await user.clear(price);
    await user.type(price, "not-a-number");
    await user.click(screen.getByRole("button", { name: /saqlash/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/narx.*butun son/i);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
