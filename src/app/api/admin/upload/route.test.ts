import { beforeEach, describe, expect, it, vi } from "vitest";

const adminApi = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  assertSameOrigin: vi.fn(),
  adminErrorResponse: vi.fn(),
}));
const imageService = vi.hoisted(() => ({
  uploadProductImage: vi.fn(),
  ProductImageUploadError: class ProductImageUploadError extends Error {},
}));

vi.mock("@/lib/admin-api", () => adminApi);
vi.mock("@/lib/services/image-upload-service", () => imageService);

import { POST } from "./route";

function uploadRequest(file?: File, alt = "Pushti atirgul buketi"): Request {
  const formData = new FormData();
  if (file) formData.set("file", file);
  formData.set("alt", alt);
  return {
    headers: new Headers({ "content-type": "multipart/form-data; boundary=test" }),
    formData: async () => formData,
  } as unknown as Request;
}

describe("admin image upload API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.requireAdmin.mockResolvedValue(undefined);
    adminApi.assertSameOrigin.mockReturnValue(undefined);
    adminApi.adminErrorResponse.mockReturnValue(
      new Response(JSON.stringify({ error: "Xatolik" }), { status: 500 })
    );
    imageService.uploadProductImage.mockResolvedValue({
      url: "https://res.cloudinary.com/nafis/image/upload/rose.webp",
      publicId: "floraluxe/products/rose",
      alt: "Pushti atirgul buketi",
    });
  });

  it("requires an admin session and same-origin request before uploading", async () => {
    const response = await POST(
      uploadRequest(new File(["rose"], "rose.webp", { type: "image/webp" }))
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      image: {
        url: "https://res.cloudinary.com/nafis/image/upload/rose.webp",
        publicId: "floraluxe/products/rose",
        alt: "Pushti atirgul buketi",
      },
    });
    expect(adminApi.requireAdmin).toHaveBeenCalledTimes(1);
    expect(adminApi.assertSameOrigin).toHaveBeenCalledTimes(1);
    expect(imageService.uploadProductImage).toHaveBeenCalledWith(
      expect.objectContaining({ name: "rose.webp", type: "image/webp" }),
      "Pushti atirgul buketi"
    );
  });

  it("rejects a non-multipart request without calling the upload service", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      })
    );

    expect(response.status).toBe(400);
    expect(imageService.uploadProductImage).not.toHaveBeenCalled();
  });

  it("rejects a multipart request without a file", async () => {
    const response = await POST(uploadRequest());

    expect(response.status).toBe(400);
    expect(imageService.uploadProductImage).not.toHaveBeenCalled();
  });
});
