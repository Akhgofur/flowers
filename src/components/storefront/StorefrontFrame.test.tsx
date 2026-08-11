import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "@/test/render-with-intl";
import { StorefrontFrame } from "./StorefrontFrame";

vi.mock("@/components/storefront/LanguageSwitcher", () => ({
  LanguageSwitcher: () => <span>RU UZ EN</span>,
}));

describe("StorefrontFrame", () => {
  it("renders shared sticky chrome and the mobile navigation around route content", () => {
    render(
      <StorefrontFrame products={[]}>
        <main><h1>Route content</h1></main>
      </StorefrontFrame>,
      { locale: "ru" }
    );

    expect(screen.getByRole("banner")).toHaveClass("site-header");
    expect(screen.getByRole("heading", { name: "Route content" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: /мобильная навигация/i })).toBeVisible();
    expect(screen.getByRole("contentinfo")).toBeVisible();
  });

  it("opens the cart as a modal dialog above the mobile chrome", async () => {
    const user = userEvent.setup();
    render(
      <StorefrontFrame products={[]}>
        <main><h1>Route content</h1></main>
      </StorefrontFrame>,
      { locale: "ru" }
    );

    await user.click(screen.getByRole("button", { name: /открыть корзину/i }));

    expect(screen.getByRole("dialog", { name: /корзина/i })).toHaveAttribute(
      "aria-modal",
      "true"
    );
    expect(document.body).toHaveStyle({ overflow: "hidden" });
  });
});
