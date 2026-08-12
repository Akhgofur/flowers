import { beforeEach, describe, expect, it, vi } from "vitest";

const cloudinary = vi.hoisted(() => ({
  v2: {
    config: vi.fn(),
    uploader: { upload: vi.fn() },
  },
}));
const env = vi.hoisted(() => ({
  CLOUDINARY_CLOUD_NAME: "floraluxe-test",
  CLOUDINARY_API_KEY: "key",
  CLOUDINARY_API_SECRET: "secret",
}));

vi.mock("cloudinary", () => cloudinary);
vi.mock("@/lib/env", () => ({ env }));

import {
  ProductImageUploadError,
  uploadProductImage,
} from "./image-upload-service";

const validFile = {
  name: "rose.webp",
  type: "image/webp",
  size: 4,
  arrayBuffer: async () => new TextEncoder().encode("rose").buffer,
};

describe("uploadProductImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cloudinary.v2.uploader.upload.mockResolvedValue({
      secure_url: "https://res.cloudinary.com/floraluxe/image/upload/rose.webp",
      public_id: "floraluxe/products/rose",
    });
  });

  it("validates inputs and uploads a safe data URI only after validation", async () => {
    await expect(uploadProductImage(validFile, "Pushti atirgul buketi")).resolves.toEqual({
      url: "https://res.cloudinary.com/floraluxe/image/upload/rose.webp",
      publicId: "floraluxe/products/rose",
      alt: "Pushti atirgul buketi",
    });

    expect(cloudinary.v2.config).toHaveBeenCalledWith({
      cloud_name: "floraluxe-test",
      api_key: "key",
      api_secret: "secret",
      secure: true,
    });
    expect(cloudinary.v2.uploader.upload).toHaveBeenCalledWith(
      "data:image/webp;base64,cm9zZQ==",
      expect.objectContaining({ folder: "floraluxe/products", resource_type: "image" })
    );
  });

  it("rejects a disallowed type before contacting Cloudinary", async () => {
    await expect(
      uploadProductImage({ ...validFile, type: "image/svg+xml" }, "Xavfsiz rasm")
    ).rejects.toBeInstanceOf(ProductImageUploadError);

    expect(cloudinary.v2.uploader.upload).not.toHaveBeenCalled();
  });

  it("rejects a file above the 5 MB boundary", async () => {
    await expect(
      uploadProductImage({ ...validFile, size: 5 * 1024 * 1024 + 1 }, "Xavfsiz rasm")
    ).rejects.toThrow("5 MB");
  });
});
