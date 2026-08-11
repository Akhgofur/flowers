import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_FILTERS } from "./catalog-utils";
import { renderWithIntl as render } from "@/test/render-with-intl";
import { MobileFilterDrawer } from "./MobileFilterDrawer";

describe("MobileFilterDrawer", () => {
  it("opens as a modal, closes on Escape, and restores the trigger", async () => {
    const user = userEvent.setup();
    render(
      <MobileFilterDrawer
        filters={DEFAULT_FILTERS}
        onChange={vi.fn()}
        onApply={vi.fn()}
        onReset={vi.fn()}
      />,
      { locale: "ru" }
    );

    const trigger = screen.getByRole("button", { name: /фильтр/i });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: /фильтр/i });
    expect(dialog).toHaveAttribute(
      "aria-modal",
      "true"
    );
    expect(dialog.parentElement?.parentElement).toBe(document.body);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: /фильтр/i })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
