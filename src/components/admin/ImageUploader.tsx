"use client";

import { useState, type ChangeEvent } from "react";
import type { ProductImage } from "@/lib/contracts";

type ImageUploaderProps = {
  alt: string;
  disabled?: boolean;
  onUploaded(image: ProductImage): void;
};

type UploadResponse = {
  image?: ProductImage;
  error?: string;
};

const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_PRODUCT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function readUploadResponse(response: Response): Promise<UploadResponse> {
  try {
    return (await response.json()) as UploadResponse;
  } catch {
    return {};
  }
}

export function ImageUploader({ alt, disabled = false, onUploaded }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || isUploading || disabled) return;

    const normalizedAlt = alt.trim();
    if (normalizedAlt.length < 2 || normalizedAlt.length > 180) {
      setError("Avval rasm tavsifini 2–180 belgi bilan kiriting.");
      return;
    }
    if (!ACCEPTED_PRODUCT_IMAGE_TYPES.has(file.type)) {
      setError("Faqat JPG, PNG yoki WebP rasm tanlang.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_PRODUCT_IMAGE_BYTES) {
      setError("Rasm hajmi 5 MB dan oshmasligi kerak.");
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("alt", normalizedAlt);
      const response = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const result = await readUploadResponse(response);
      if (!response.ok || !result.image) {
        throw new Error(result.error ?? "Rasm yuklanmadi.");
      }
      onUploaded(result.image);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Rasm yuklanmadi.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="admin-image-upload">
      <label className="admin-secondary-button admin-image-upload__button">
        <input
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || isUploading}
          type="file"
          onChange={upload}
        />
        {isUploading ? "Rasm yuklanmoqda…" : "Cloudinary'dan rasm yuklash"}
      </label>
      <p>JPG, PNG yoki WebP · maksimal 5 MB.</p>
      {error ? <p className="admin-form-error" role="alert">{error}</p> : null}
    </div>
  );
}
