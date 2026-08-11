import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AdminCategory } from "@/lib/contracts";
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
});
