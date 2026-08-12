import type { SyntheticEvent } from "react";
import { describe, expect, it } from "vitest";
import {
  applyImageFallback,
  IMAGE_FALLBACK_ALT,
  IMAGE_FALLBACK_URL,
} from "./image-fallback";

function failImage(src: string, alt = "Qirmizi atirgul gul kompozitsiyasi") {
  const image = document.createElement("img");
  image.src = src;
  image.alt = alt;

  applyImageFallback({
    currentTarget: image,
  } as unknown as SyntheticEvent<HTMLImageElement>);

  return image;
}

describe("applyImageFallback", () => {
  it("swaps a broken product image for the shared floral fallback", () => {
    const image = failImage("https://cdn.example.com/missing.jpg");

    expect(image.src).toBe(IMAGE_FALLBACK_URL);
    expect(image.alt).toBe(IMAGE_FALLBACK_ALT);
    expect(image.dataset.imageFallback).toBe("true");
  });

  it("serves the fallback over https so it is not blocked on the live site", () => {
    expect(IMAGE_FALLBACK_URL).toMatch(/^https:\/\//);
  });

  it("describes the substitution truthfully instead of keeping the product alt", () => {
    const image = failImage("https://cdn.example.com/missing.jpg", "Pushti pion buketi");

    expect(image.alt).not.toBe("Pushti pion buketi");
    expect(image.alt).toBe(IMAGE_FALLBACK_ALT);
  });

  // Without the marker a failing fallback would re-fire onError forever.
  it("does not reapply itself when the fallback image also fails", () => {
    const image = failImage("https://cdn.example.com/missing.jpg");
    image.alt = "Qo‘lda o‘zgartirilgan";

    applyImageFallback({
      currentTarget: image,
    } as unknown as SyntheticEvent<HTMLImageElement>);

    expect(image.alt).toBe("Qo‘lda o‘zgartirilgan");
    expect(image.src).toBe(IMAGE_FALLBACK_URL);
  });
});
