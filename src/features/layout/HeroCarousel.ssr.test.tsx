/** @vitest-environment node */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeroCarousel } from "./HeroCarousel";

describe("HeroCarousel server rendering", () => {
  it("does not access browser APIs while rendering on the server", () => {
    const markup = renderToStaticMarkup(
      <HeroCarousel
        slides={[
          {
            id: "test-slide",
            eyebrow: "Test",
            title: "Server-safe hero",
            description: "Server rendering should succeed without window.",
            ctaLabel: "Katalog",
            ctaTarget: "#catalog",
            image: "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg",
          },
        ]}
        onNavigate={() => undefined}
      />,
    );

    expect(markup).toContain("Server-safe hero");
  });
});
