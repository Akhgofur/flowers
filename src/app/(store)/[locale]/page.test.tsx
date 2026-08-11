import { screen } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithIntl as render } from "@/test/render-with-intl";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock("@/components/storefront/LanguageSwitcher", () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));

import StorePage from "./page";

describe("store route shell", () => {
  it("renders the Nafis storefront route shell", async () => {
    render(await StorePage({ params: Promise.resolve({ locale: "ru" }) }));

    expect(screen.getByRole("main", { name: /каталог/i })).toBeInTheDocument();
  });
});
