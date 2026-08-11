import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminProduct } from "@/lib/contracts";

const adminApi = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  assertSameOrigin: vi.fn(),
  adminErrorResponse: vi.fn(),
}));
const adminService = vi.hoisted(() => ({
  getAdminProducts: vi.fn(),
  createAdminProduct: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => adminApi);
vi.mock("@/lib/services/admin-service", () => adminService);

import { GET, POST } from "./route";

const product: AdminProduct = {
  id: "507f1f77bcf86cd799439011",
  name: "Pushti lola buketi",
  slug: "pushti-lola-buketi",
  shortDescription: "Yangi lolalardan tuzilgan mayin kompozitsiya.",
  description: "Bayram va yaqin insonlar uchun nafis sovg'a.",
  composition: ["Lola"],
  categoryId: "507f191e810c19729de860ea",
  price: 150_000,
  currency: "UZS",
  images: [
    {
      url: "https://images.pexels.com/photos/1234567/tulips.jpg",
      alt: "Pushti lolalardan tayyorlangan buket",
    },
  ],
  flowerTypes: ["tulip"],
  colors: ["pink"],
  stockQuantity: 12,
  sortOrder: 0,
  isFeatured: false,
  isNew: true,
  isOnSale: false,
  status: "published",
  createdAt: "2026-08-11T10:00:00.000Z",
  updatedAt: "2026-08-11T10:00:00.000Z",
};

function jsonRequest(body?: unknown) {
  return new Request("http://localhost/api/admin/products", {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("admin products API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.requireAdmin.mockResolvedValue(undefined);
    adminApi.assertSameOrigin.mockReturnValue(undefined);
    adminApi.adminErrorResponse.mockReturnValue(
      new Response(JSON.stringify({ error: "Xatolik" }), { status: 500 })
    );
  });

  it("requires an admin session before reading products", async () => {
    adminService.getAdminProducts.mockResolvedValue([product]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ products: [product] });
    expect(adminApi.requireAdmin).toHaveBeenCalledTimes(1);
  });

  it("validates and creates a product only after same-origin admin checks", async () => {
    adminService.createAdminProduct.mockResolvedValue(product);
    const input = {
      ...product,
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    };

    const response = await POST(jsonRequest(input));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ product });
    expect(adminApi.requireAdmin).toHaveBeenCalledTimes(1);
    expect(adminApi.assertSameOrigin).toHaveBeenCalledTimes(1);
    expect(adminService.createAdminProduct).toHaveBeenCalledWith(
      expect.objectContaining({ name: product.name, categoryId: product.categoryId })
    );
  });

  it("rejects unknown fields instead of forwarding them to MongoDB", async () => {
    const response = await POST(jsonRequest({ ...product, injected: true }));

    expect(response.status).toBe(400);
    expect(adminService.createAdminProduct).not.toHaveBeenCalled();
  });
});
