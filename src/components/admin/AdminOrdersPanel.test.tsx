import { render, screen, waitFor } from "@testing-library/react";
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
