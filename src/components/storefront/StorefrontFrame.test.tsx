import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CatalogProduct } from "@/lib/contracts";
import { renderWithIntl as render } from "@/test/render-with-intl";
import { StorefrontFrame, useStorefront } from "./StorefrontFrame";

vi.mock("@/components/storefront/LanguageSwitcher", () => ({
  LanguageSwitcher: () => <span>RU UZ EN</span>,
}));

const ROSES: CatalogProduct = {
  id: "507f1f77bcf86cd799439011",
  name: "Qirmizi atirgul buketi",
  slug: "qirmizi-atirgul-buketi",
  shortDescription: "Qirmizi atirgullardan buket.",
  description: "Bayram uchun qirmizi atirgullar.",
  composition: ["Atirgul"],
  price: 535_000,
  currency: "UZS",
  images: [{ url: "https://images.pexels.com/photos/1/roses.jpg", alt: "Qirmizi atirgullar" }],
  categorySlug: "roses",
  flowerTypes: ["rose"],
  colors: ["red"],
  seasons: ["all_year"],
  sortOrder: 1,
  isFeatured: false,
  isNew: false,
  isOnSale: false,
  status: "published",
  deliveryEstimate: "Bugun 90 daqiqada",
  size: "55 sm",
};

/** A product the routes under test never ship, so it can only come from storage. */
const TULIPS: CatalogProduct = {
  ...ROSES,
  id: "507f1f77bcf86cd799439012",
  name: "Tonggi lolalar",
  slug: "tonggi-lolalar",
  price: 285_000,
  categorySlug: "tulips",
  flowerTypes: ["tulip"],
  colors: ["pink"],
};

/** Drives the frame's context the way a real route island would. */
function CartTrigger() {
  const { addProduct, toggleFavorite } = useStorefront();
  return (
    <>
      <button type="button" onClick={() => addProduct(ROSES.id)}>
        Savatga
      </button>
      <button type="button" onClick={() => toggleFavorite(ROSES.id)}>
        Sevimlilarga
      </button>
    </>
  );
}

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

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

  it("exposes the same working favorites destination on desktop and mobile", () => {
    render(
      <StorefrontFrame products={[]}>
        <main><h1>Route content</h1></main>
      </StorefrontFrame>,
      { locale: "en" }
    );

    const favoritesLinks = screen.getAllByRole("link", { name: /favorites/i });
    expect(favoritesLinks).toHaveLength(2);
    expect(favoritesLinks[0]).toHaveAttribute("href", "/en/catalog?favorites=true");
    expect(favoritesLinks[1]).toHaveAttribute("href", "/en/catalog?favorites=true");
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

  it("announces a cart addition through a live status region", async () => {
    const user = userEvent.setup();
    render(
      <StorefrontFrame products={[ROSES]}>
        <main><CartTrigger /></main>
      </StorefrontFrame>,
      { locale: "uz" }
    );

    await user.click(screen.getByRole("button", { name: "Savatga" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Qirmizi atirgul buketi savatga qo‘shildi."
    );
  });

  it("announces favorite changes in both directions", async () => {
    const user = userEvent.setup();
    render(
      <StorefrontFrame products={[ROSES]}>
        <main><CartTrigger /></main>
      </StorefrontFrame>,
      { locale: "uz" }
    );

    const toggle = screen.getByRole("button", { name: "Sevimlilarga" });

    await user.click(toggle);
    expect(screen.getByRole("status")).toHaveTextContent(/sevimlilarga qo‘shildi/i);

    await user.click(toggle);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/sevimlilardan olib tashlandi/i)
    );
  });

  // Each announcement carries its own id so a later one is not cleared early by
  // the previous timeout, and the region empties three seconds after the last.
  it("refreshes a repeated announcement and auto-dismisses it after three seconds", async () => {
    vi.useFakeTimers();
    render(
      <StorefrontFrame products={[ROSES]}>
        <main><CartTrigger /></main>
      </StorefrontFrame>,
      { locale: "uz" }
    );

    const add = screen.getByRole("button", { name: "Savatga" });

    act(() => add.click());
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2000));
    act(() => add.click());

    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("ignores cart requests for products the route did not ship", async () => {
    const user = userEvent.setup();
    render(
      <StorefrontFrame products={[]}>
        <main><CartTrigger /></main>
      </StorefrontFrame>,
      { locale: "uz" }
    );

    await user.click(screen.getByRole("button", { name: "Savatga" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

/**
 * A route only ships the products it renders, but the basket outlives the route.
 * A product page used to show a one-line cart and a total covering that line
 * alone, silently hiding everything the shopper had added elsewhere.
 */
describe("StorefrontFrame cart lines from other routes", () => {
  const seedCart = (...lines: { productId: string; quantity: number }[]) =>
    localStorage.setItem("floraluxe.cart.v1", JSON.stringify(lines));

  const openCart = async (user: ReturnType<typeof userEvent.setup>) =>
    user.click(screen.getByRole("button", { name: /Savatni ochish/i }));

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches and shows basket lines the current route never rendered", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ products: [TULIPS] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    seedCart(
      { productId: ROSES.id, quantity: 3 },
      { productId: TULIPS.id, quantity: 2 }
    );

    const user = userEvent.setup();
    render(
      <StorefrontFrame products={[ROSES]}>
        <main><CartTrigger /></main>
      </StorefrontFrame>,
      { locale: "uz" }
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const requested = new URL(String(fetchMock.mock.calls[0][0]), "http://localhost");
    expect(requested.pathname).toBe("/api/products");
    expect(requested.searchParams.get("ids")).toBe(TULIPS.id);
    expect(requested.searchParams.get("locale")).toBe("uz");

    await openCart(user);

    expect(await screen.findByText(TULIPS.name)).toBeInTheDocument();
    expect(screen.getByText(ROSES.name)).toBeInTheDocument();
  });

  it("does not ask the server for products the route already shipped", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    seedCart({ productId: ROSES.id, quantity: 1 });

    render(
      <StorefrontFrame products={[ROSES]}>
        <main><CartTrigger /></main>
      </StorefrontFrame>,
      { locale: "uz" }
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Savatni ochish/i })).toBeInTheDocument()
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the storefront usable when the lookup fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    seedCart({ productId: TULIPS.id, quantity: 1 });

    const user = userEvent.setup();
    render(
      <StorefrontFrame products={[ROSES]}>
        <main><CartTrigger /></main>
      </StorefrontFrame>,
      { locale: "uz" }
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await openCart(user);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
