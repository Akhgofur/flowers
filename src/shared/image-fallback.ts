import type { SyntheticEvent } from "react";

export const IMAGE_FALLBACK_URL =
  "https://images.pexels.com/photos/1808178/pexels-photo-1808178.jpeg?auto=compress&cs=tinysrgb&w=1200";

export const IMAGE_FALLBACK_ALT = "Nafis gullari — muqobil rasm";

export function applyImageFallback(
  event: SyntheticEvent<HTMLImageElement>,
): void {
  const image = event.currentTarget;

  if (image.dataset.imageFallback === "true") {
    return;
  }

  image.dataset.imageFallback = "true";
  image.alt = IMAGE_FALLBACK_ALT;
  image.src = IMAGE_FALLBACK_URL;
}
