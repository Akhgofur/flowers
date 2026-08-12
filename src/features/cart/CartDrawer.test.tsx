import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import type { CartLine, Product } from "@/shared/types";
import { CartDrawer, type CartDrawerProps } from "./CartDrawer";

const ROSES: Product = {
  id: "roses",
  name: "Qirmizi atirgul",
  price: 535000,
  image: "https://images.pexels.com/photos/1/a.jpeg",
  category: "roses",
  flowerTypes: ["rose"],
  colors: ["red"],
  isNew: false,
  isOnSale: false,
  shortDescription: "Qirmizi atirgullar.",
  composition: ["25 ta atirgul"],
  deliveryEstimate: "90 daqiqa",
  size: "55 sm",
};

const ON_REQUEST: Product = {
  ...ROSES,
  id: "on-request",
  name: "Narxsiz buket",
  price: undefined,
};

function renderDrawer(overrides: Partial<CartDrawerProps> = {}) {
  const props: CartDrawerProps = {
    open: true,
    lines: [{ productId: "roses", quantity: 2 }] as CartLine[],
    products: [ROSES, ON_REQUEST],
    restoreFocusTarget: null,
    onClose: vi.fn(),
    onSetQuantity: vi.fn(),
    onRemove: vi.fn(),
    onContinueShopping: vi.fn(),
    ...overrides,
  };

  renderWithIntl(<CartDrawer {...props} />, { locale: "uz" });
  return props;
}

describe("CartDrawer", () => {
  it("renders nothing while closed", () => {
    renderDrawer({ open: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens as a labelled modal dialog and focuses its close button", () => {
    renderDrawer();

    const dialog = screen.getByRole("dialog", { name: /savat/i });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: /savatni yopish/i })).toHaveFocus();
  });

  it("shows the line quantity, unit price and running total", () => {
    renderDrawer();

    const line = screen.getByRole("article");
    expect(within(line).getByLabelText("Qirmizi atirgul miqdori")).toHaveTextContent("2");
    // 535 000 unit price, so the line and the subtotal both read 1 070 000.
    expect(within(line).getByText("535 000 so‘m / dona")).toBeVisible();
    expect(within(line).getByText("1 070 000 so‘m")).toBeVisible();
    expect(
      within(screen.getByRole("dialog").querySelector("footer")!).getByText(
        "1 070 000 so‘m"
      )
    ).toBeVisible();
  });

  // Products entered without a price are not purchasable, so the cart must skip
  // them instead of rendering a line with a missing or NaN total.
  it("omits cart lines whose product has no price", () => {
    renderDrawer({
      lines: [
        { productId: "roses", quantity: 1 },
        { productId: "on-request", quantity: 1 },
      ] as CartLine[],
    });

    expect(screen.getByRole("heading", { name: "Qirmizi atirgul" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Narxsiz buket" })).not.toBeInTheDocument();
  });

  it("changes quantity with plus and minus and removes the line", async () => {
    const user = userEvent.setup();
    const props = renderDrawer();

    await user.click(screen.getByRole("button", { name: /miqdorini oshirish/i }));
    expect(props.onSetQuantity).toHaveBeenCalledWith("roses", 3);

    await user.click(screen.getByRole("button", { name: /miqdorini kamaytirish/i }));
    expect(props.onSetQuantity).toHaveBeenCalledWith("roses", 1);

    await user.click(screen.getByRole("button", { name: /savatdan olib tashlash/i }));
    expect(props.onRemove).toHaveBeenCalledWith("roses");
  });

  it("stops the quantity control at ninety-nine", () => {
    renderDrawer({ lines: [{ productId: "roses", quantity: 99 }] as CartLine[] });

    expect(screen.getByRole("button", { name: /miqdorini oshirish/i })).toBeDisabled();
  });

  it("links to the locale-aware checkout route", () => {
    renderDrawer();

    expect(
      screen.getByRole("link", { name: /buyurtmani rasmiylashtirish/i })
    ).toHaveAttribute("href", "/uz/checkout");
  });

  it("shows an empty state that hands the shopper back to the catalog", async () => {
    const user = userEvent.setup();
    const props = renderDrawer({ lines: [] });

    expect(screen.getByRole("heading", { name: /savatingiz hozircha bo‘sh/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /katalogga qaytish/i }));
    expect(props.onContinueShopping).toHaveBeenCalled();
  });

  it("closes with Escape", () => {
    const props = renderDrawer();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(props.onClose).toHaveBeenCalled();
  });

  it("closes when the backdrop is pressed but not the drawer itself", () => {
    const props = renderDrawer();

    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(props.onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(screen.getByRole("dialog").parentElement!);
    expect(props.onClose).toHaveBeenCalled();
  });

  it("contains focus with Tab and Shift+Tab", async () => {
    const user = userEvent.setup();
    renderDrawer();

    const close = screen.getByRole("button", { name: /savatni yopish/i });
    const checkout = screen.getByRole("link", { name: /buyurtmani rasmiylashtirish/i });

    expect(close).toHaveFocus();

    await user.tab({ shift: true });
    expect(checkout).toHaveFocus();

    await user.tab();
    expect(close).toHaveFocus();
  });

  // The trap defers restoration to a microtask so the parent can drop `inert` first.
  it("restores focus to the trigger that opened it", async () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Savatni ochish";
    document.body.append(trigger);

    const { unmount } = renderWithIntl(
      <CartDrawer
        open
        lines={[]}
        products={[ROSES]}
        restoreFocusTarget={trigger}
        onClose={vi.fn()}
        onSetQuantity={vi.fn()}
        onRemove={vi.fn()}
        onContinueShopping={vi.fn()}
      />,
      { locale: "uz" }
    );

    unmount();
    await waitFor(() => expect(trigger).toHaveFocus());

    trigger.remove();
  });
});
