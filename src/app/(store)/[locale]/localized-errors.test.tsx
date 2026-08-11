import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import StoreNotFound from "./not-found";
import ProductError from "./products/[slug]/error";
import ProductLoading from "./products/[slug]/loading";

describe("localized storefront fallback routes", () => {
  it("renders the locale not-found page in English", () => {
    renderWithIntl(<StoreNotFound />, { locale: "en" });

    expect(
      screen.getByRole("heading", { name: "Page not found" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse flowers" })
    ).toHaveAttribute("href", "/en/catalog");
  });

  it("renders the product error boundary in Russian", () => {
    renderWithIntl(
      <ProductError
        error={new Error("private database detail")}
        reset={vi.fn()}
      />,
      { locale: "ru" }
    );

    expect(
      screen.getByRole("heading", { name: "Не удалось загрузить товар" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Попробовать снова" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Вернуться в каталог" })
    ).toHaveAttribute("href", "/ru/catalog");
    expect(screen.queryByText(/private database detail/i)).not.toBeInTheDocument();
  });

  it("announces the product loading state in the active locale", () => {
    renderWithIntl(<ProductLoading />, { locale: "en" });

    expect(
      screen.getByRole("main", { name: "Loading product" })
    ).toHaveAttribute("aria-busy", "true");
  });
});
