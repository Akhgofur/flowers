import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import type { Locale } from "@/i18n/config";
import { Header, type HeaderProps } from "./Header";

vi.mock("@/components/storefront/LanguageSwitcher", () => ({
  LanguageSwitcher: () => <span>RU UZ EN</span>,
}));

function renderHeader(overrides: Partial<HeaderProps> = {}, locale: Locale = "uz") {
  const props: HeaderProps = {
    cartItemCount: 0,
    favoriteCount: 0,
    isCartOpen: false,
    onOpenCart: vi.fn(),
    ...overrides,
  };

  renderWithIntl(<Header {...props} />, { locale });
  return props;
}

describe("Header", () => {
  it.each([
    ["ru", "Каталог", "Скидки", "Доставка"],
    ["uz", "Katalog", "Chegirmalar", "Yetkazib berish"],
    ["en", "Catalog", "Sale", "Delivery"],
  ] as const)("renders %s navigation copy", (locale, catalog, sale, delivery) => {
    renderHeader({}, locale);

    const nav = screen.getByRole("navigation", {
      name:
        locale === "ru"
          ? /основная навигация/i
          : locale === "uz"
            ? /asosiy navigatsiya/i
            : /primary navigation/i,
    });

    expect(within(nav).getByRole("link", { name: catalog })).toBeVisible();
    expect(within(nav).getByRole("link", { name: sale })).toBeVisible();
    expect(within(nav).getByRole("link", { name: delivery })).toBeVisible();
  });

  it("points the favorites shortcut at the locale-aware wishlist", () => {
    renderHeader({ favoriteCount: 3 });

    expect(screen.getByRole("link", { name: /sevimlilar, 3/i })).toHaveAttribute(
      "href",
      "/uz/catalog?favorites=true"
    );
  });

  it("announces cart state and hands its trigger to the opener", async () => {
    const user = userEvent.setup();
    const props = renderHeader({ cartItemCount: 2 });

    const cartButton = screen.getByRole("button", {
      name: /savatni ochish, 2 ta mahsulot/i,
    });
    expect(cartButton).toHaveAttribute("aria-expanded", "false");

    await user.click(cartButton);

    expect(props.onOpenCart).toHaveBeenCalledWith(cartButton);
  });

  it("marks the cart button expanded while the drawer is open", () => {
    renderHeader({ isCartOpen: true });

    expect(
      screen.getByRole("button", { name: /savatni yopish, savat bo‘sh/i })
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("opens the mobile menu and closes it after a link is selected", async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole("button", { name: /mobil menyuni ochish/i }));

    const mobileNav = screen.getByRole("navigation", { name: /mobil navigatsiya/i });
    await user.click(within(mobileNav).getByRole("link", { name: "Katalog" }));

    expect(
      screen.queryByRole("navigation", { name: /mobil navigatsiya/i })
    ).not.toBeInTheDocument();
  });

  it("closes the mobile menu on Escape and returns focus to its toggle", async () => {
    const user = userEvent.setup();
    renderHeader();

    const toggle = screen.getByRole("button", { name: /mobil menyuni ochish/i });
    await user.click(toggle);
    expect(screen.getByRole("navigation", { name: /mobil navigatsiya/i })).toBeVisible();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(
      screen.queryByRole("navigation", { name: /mobil navigatsiya/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mobil menyuni ochish/i })).toHaveFocus();
  });

  it("prefers database-managed contact copy over the build-time fallback", () => {
    renderHeader({
      settings: {
        address: "Chilonzor 5",
        workingHours: "09:00–21:00",
        instagramUrl: "https://instagram.com/floraluxe",
      } as HeaderProps["settings"],
    });

    expect(screen.getByText("Chilonzor 5")).toBeVisible();
    expect(screen.getByText("09:00–21:00")).toBeVisible();
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://instagram.com/floraluxe"
    );
  });

  it("compacts once the page is scrolled past the utility bar", () => {
    renderHeader();

    const header = screen.getByRole("banner");
    expect(header).not.toHaveClass("site-header--compact");

    window.scrollY = 120;
    fireEvent.scroll(window);

    expect(header).toHaveClass("site-header--compact");
    window.scrollY = 0;
  });
});
