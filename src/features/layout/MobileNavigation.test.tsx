import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "@/test/render-with-intl";
import { MobileNavigation } from "./MobileNavigation";

describe("MobileNavigation", () => {
  it("exposes home, catalog, favorites, and cart as one mobile navigation", () => {
    render(
      <MobileNavigation
        cartItemCount={2}
        favoriteCount={1}
        onOpenCart={vi.fn()}
      />,
      { locale: "ru" }
    );

    const navigation = screen.getByRole("navigation", { name: /мобильная навигация/i });
    expect(navigation).toHaveTextContent(/главная/i);
    expect(navigation).toHaveTextContent(/каталог/i);
    expect(navigation).toHaveTextContent(/избранное/i);
    expect(navigation).toHaveTextContent(/корзина/i);
    expect(screen.getByRole("button", { name: /корзина.*2/i })).toBeInTheDocument();
  });
});
