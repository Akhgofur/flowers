import { beforeEach, describe, expect, it, vi } from "vitest";

const adminApi = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  assertSameOrigin: vi.fn(),
  adminErrorResponse: vi.fn(),
}));
const adminService = vi.hoisted(() => ({
  editAdminProduct: vi.fn(),
  patchAdminProductFields: vi.fn(),
  removeAdminProduct: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => adminApi);
vi.mock("@/lib/services/admin-service", () => adminService);

import { PUT } from "./route";

const productId = "507f1f77bcf86cd799439012";
const input = {
  slug: "rose-basket",
  translations: {
    ru: {
      name: "Rose basket",
      shortDescription: "Fresh roses",
      description: "Fresh roses in a basket",
      composition: ["Roses"],
    },
    uz: {
      name: "Atirgul savati",
      shortDescription: "Yangi atirgullar",
      description: "Savatdagi yangi atirgullar",
      composition: ["Atirgullar"],
    },
    en: {
      name: "Rose basket",
      shortDescription: "Fresh roses",
      description: "Fresh roses in a basket",
      composition: ["Roses"],
    },
  },
  categoryId: "507f1f77bcf86cd799439011",
  currency: "UZS" as const,
  images: [
    { url: "https://example.com/rose.jpg", alt: "Rose basket" },
    { url: "https://example.com/rose-detail.jpg", alt: "Rose basket detail" },
  ],
  flowerTypes: ["rose"],
  colors: ["red"],
  seasons: ["all_year"] as const,
  sortOrder: 1,
  isFeatured: false,
  isNew: false,
  isOnSale: false,
  status: "published" as const,
};

function putRequest(body: unknown) {
  return new Request(`http://localhost/api/admin/products/${productId}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("admin product full update API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.requireAdmin.mockResolvedValue(undefined);
    adminApi.assertSameOrigin.mockReturnValue(undefined);
    adminApi.adminErrorResponse.mockReturnValue(
      new Response(JSON.stringify({ error: "Xatolik" }), { status: 500 })
    );
  });

  it("validates and replaces the complete product after admin checks", async () => {
    adminService.editAdminProduct.mockResolvedValue({ id: productId, ...input });

    const response = await PUT(putRequest(input), {
      params: Promise.resolve({ id: productId }),
    });

    expect(response.status).toBe(200);
    expect(adminApi.requireAdmin).toHaveBeenCalledTimes(1);
    expect(adminApi.assertSameOrigin).toHaveBeenCalledTimes(1);
    expect(adminService.editAdminProduct).toHaveBeenCalledWith(productId, input);
  });

  it("rejects incomplete full replacements", async () => {
    const response = await PUT(putRequest({ slug: "rose-basket" }), {
      params: Promise.resolve({ id: productId }),
    });

    expect(response.status).toBe(400);
    expect(adminService.editAdminProduct).not.toHaveBeenCalled();
  });
});
