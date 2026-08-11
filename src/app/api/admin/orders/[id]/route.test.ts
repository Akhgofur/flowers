import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredOrder } from "@/lib/services/order-service";

const adminApi = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  assertSameOrigin: vi.fn(),
  adminErrorResponse: vi.fn(),
}));
const adminService = vi.hoisted(() => ({
  transitionAdminOrder: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => adminApi);
vi.mock("@/lib/services/admin-service", () => adminService);

import { PATCH } from "./route";

const order: StoredOrder = {
  id: "507f1f77bcf86cd799439011",
  number: "NF-20260811-ORDER1234",
  customer: {
    fullName: "Ali Valiyev",
    phone: "+998901234567",
    address: "Toshkent shahri, Chilonzor tumani",
  },
  items: [
    {
      productId: "507f191e810c19729de860ea",
      slug: "pushti-lola-buketi",
      name: "Pushti lola buketi",
      imageUrl: "https://images.pexels.com/photos/1234567/tulips.jpg",
      unitPrice: 150_000,
      quantity: 1,
      lineTotal: 150_000,
    },
  ],
  subtotal: 150_000,
  deliveryFee: 20_000,
  total: 170_000,
  paymentMethod: "cash_on_delivery",
  paymentStatus: "unpaid",
  status: "confirmed",
};

describe("admin order transition API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.requireAdmin.mockResolvedValue(undefined);
    adminApi.assertSameOrigin.mockReturnValue(undefined);
    adminApi.adminErrorResponse.mockReturnValue(
      new Response(JSON.stringify({ error: "Xatolik" }), { status: 500 })
    );
  });

  it("allows only declared order statuses after authenticating the administrator", async () => {
    adminService.transitionAdminOrder.mockResolvedValue(order);

    const response = await PATCH(
      new Request("http://localhost/api/admin/orders/507f1f77bcf86cd799439011", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      }),
      { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ order });
    expect(adminService.transitionAdminOrder).toHaveBeenCalledWith(order.id, "confirmed");
  });

  it("does not delegate made-up lifecycle states", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/admin/orders/507f1f77bcf86cd799439011", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      }),
      { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) }
    );

    expect(response.status).toBe(400);
    expect(adminService.transitionAdminOrder).not.toHaveBeenCalled();
  });
});
