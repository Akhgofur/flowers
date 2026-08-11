import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminCategoriesPanel } from "./AdminCategoriesPanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("AdminCategoriesPanel locale drafts", () => {
  it("keeps category names isolated by locale", async () => {
    const user = userEvent.setup();
    render(<AdminCategoriesPanel initialCategories={[]} />);

    await user.click(screen.getByRole("button", { name: /kategoriya qo‘shish/i }));
    await user.type(screen.getByLabelText("Kategoriya nomi"), "Розы");
    await user.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByLabelText("Kategoriya nomi")).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Русский" }));
    expect(screen.getByLabelText("Kategoriya nomi")).toHaveValue("Розы");
  });
});
