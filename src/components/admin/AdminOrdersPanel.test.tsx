import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AdminOrder } from "@/lib/contracts";
import { AdminOrdersPanel } from "./AdminOrdersPanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const order: AdminOrder = {
  id: "507f1f77bcf86cd799439011",
  number: "FL-20260811-ABC123",
  locale: "ru",
  customer: { fullName: "Anna", phone: "+998901234567", address: "Tashkent" },
  items: [{
    productId: "507f1f77bcf86cd799439012",
    slug: "rose-basket",
    name: "Rose basket",
    imageUrl: "https://example.com/rose.jpg",
    unitPrice: 500_000,
    quantity: 1,
    lineTotal: 500_000,
  }],
  subtotal: 500_000,
  deliveryFee: 0,
  total: 500_000,
  paymentMethod: "cash_on_delivery",
  paymentStatus: "unpaid",
  status: "pending",
  telegram: {
    status: "failed",
    attempts: 2,
    lastErrorCode: "TIMEOUT",
  },
  createdAt: "2026-08-11T10:00:00.000Z",
  updatedAt: "2026-08-11T10:00:00.000Z",
};

describe("AdminOrdersPanel notifications", () => {
  it("shows Telegram delivery status and retries without a modal", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ attempted: 1, sent: 1, failed: 0 }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminOrdersPanel initialOrders={[order]} />);

    expect(screen.getByText("TIMEOUT")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Telegram xabarini qayta yuborish" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/orders/${order.id}/retry-notification`,
      { method: "POST" }
    ));
    expect(await screen.findByText("Telegram xabari yuborildi.")).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});

describe("AdminOrdersPanel order lines", () => {
  it("shows the ordered product image so the florist can prepare it", () => {
    render(<AdminOrdersPanel initialOrders={[order]} />);

    // The img is decorative: the button around it carries the accessible name,
    // so screen readers announce the product once rather than twice.
    const trigger = screen.getByRole("button", { name: /rose basket rasmini kattalashtirish/i });
    const image = trigger.querySelector("img");
    expect(image).toBeVisible();
    expect(image?.getAttribute("src")).toContain("rose.jpg");
  });

  it("keeps the quantity and name beside the image", () => {
    render(<AdminOrdersPanel initialOrders={[order]} />);

    expect(screen.getByText(/1×\s*Rose basket/)).toBeVisible();
  });

  // An order placed before an image existed, or a product deleted since, must not
  // break the fulfilment list.
  it("renders a line whose product has no image", () => {
    const withoutImage: AdminOrder = {
      ...order,
      items: [{ ...order.items[0]!, imageUrl: "" }],
    };

    render(<AdminOrdersPanel initialOrders={[withoutImage]} />);

    expect(screen.getByText(/1×\s*Rose basket/)).toBeVisible();
    expect(screen.queryByRole("img", { name: /rose basket/i })).not.toBeInTheDocument();
  });
});

describe("AdminOrdersPanel image lightbox", () => {
  it("enlarges the product image when its thumbnail is activated", async () => {
    const user = userEvent.setup();
    render(<AdminOrdersPanel initialOrders={[order]} />);

    await user.click(screen.getByRole("button", { name: /rose basket.*kattalashtirish/i }));

    const dialog = screen.getByRole("dialog", { name: /rose basket/i });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const enlarged = within(dialog).getByRole("img", { name: /rose basket/i });
    expect(enlarged.getAttribute("src")).toContain("rose.jpg");
  });

  it("closes on Escape and hands focus back to the thumbnail", async () => {
    const user = userEvent.setup();
    render(<AdminOrdersPanel initialOrders={[order]} />);

    const trigger = screen.getByRole("button", { name: /rose basket.*kattalashtirish/i });
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeVisible();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("closes from its own close control", async () => {
    const user = userEvent.setup();
    render(<AdminOrdersPanel initialOrders={[order]} />);

    await user.click(screen.getByRole("button", { name: /rose basket.*kattalashtirish/i }));
    await user.click(screen.getByRole("button", { name: /yopish/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("offers no zoom control for a line without an image", () => {
    const withoutImage: AdminOrder = {
      ...order,
      items: [{ ...order.items[0]!, imageUrl: "" }],
    };

    render(<AdminOrdersPanel initialOrders={[withoutImage]} />);

    expect(
      screen.queryByRole("button", { name: /kattalashtirish/i })
    ).not.toBeInTheDocument();
  });
});
