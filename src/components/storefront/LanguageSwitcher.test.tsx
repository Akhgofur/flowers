import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("@/i18n/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/i18n/navigation")>();
  return {
    ...actual,
    usePathname: () => "/catalog",
    useRouter: () => ({ replace: navigation.replace }),
  };
});

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    useSearchParams: () => new URLSearchParams("sale=true&query=rose"),
  };
});

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    navigation.replace.mockClear();
    window.history.replaceState({}, "", "/ru/catalog?sale=true&query=rose#delivery");
  });

  it("preserves the logical route, query, and hash while changing locale", async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageSwitcher />, { locale: "ru" });

    expect(screen.getByRole("button", { name: "RU" })).toHaveAttribute(
      "aria-current",
      "true"
    );
    await user.click(screen.getByRole("button", { name: "EN" }));

    expect(navigation.replace).toHaveBeenCalledWith(
      "/catalog?sale=true&query=rose#delivery",
      { locale: "en" }
    );
  });
});
