import "server-only";
import { v2 as cloudinary } from "cloudinary";
import type { ProductImage } from "@/lib/contracts";
import { env } from "@/lib/env";

const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_PRODUCT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ProductImageUpload = {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export class ProductImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductImageUploadError";
  }
}

function assertUploadInput(file: ProductImageUpload, alt: string): string {
  if (!ACCEPTED_PRODUCT_IMAGE_TYPES.has(file.type)) {
    throw new ProductImageUploadError("Faqat JPG, PNG yoki WebP rasm yuklash mumkin.");
  }

  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new ProductImageUploadError("Rasm hajmi 5 MB dan oshmasligi kerak.");
  }

  const normalizedAlt = alt.trim();
  if (normalizedAlt.length < 2 || normalizedAlt.length > 180) {
    throw new ProductImageUploadError("Rasm tavsifi 2–180 belgi bo'lishi kerak.");
  }

  return normalizedAlt;
}

export async function uploadProductImage(
  file: ProductImageUpload,
  alt: string
): Promise<ProductImage> {
  const normalizedAlt = assertUploadInput(file, alt);
  const binary = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${binary.toString("base64")}`;

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const uploaded = await cloudinary.uploader.upload(dataUri, {
    folder: "floraluxe/products",
    resource_type: "image",
    overwrite: false,
    unique_filename: true,
    use_filename: false,
  });

  if (!uploaded.secure_url || !uploaded.public_id) {
    throw new Error("Cloudinary rasm manzilini qaytarmadi.");
  }

  return {
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
    alt: normalizedAlt,
  };
}

export const productImageUploadPolicy = {
  acceptedTypes: [...ACCEPTED_PRODUCT_IMAGE_TYPES],
  maxBytes: MAX_PRODUCT_IMAGE_BYTES,
} as const;
