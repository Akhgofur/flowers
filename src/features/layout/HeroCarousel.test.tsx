import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import type { HeroSlide } from "@/shared/types";
import { HeroCarousel } from "./HeroCarousel";

const SLIDES: HeroSlide[] = [
  {
    id: "summer",
    eyebrow: "Mavsum",
    title: "Birinchi slayd",
    description: "Birinchi slayd tavsifi.",
    ctaLabel: "Katalog",
    ctaTarget: "#catalog",
    image: "https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg",
  },
  {
    id: "sale",
    eyebrow: "Chegirma",
    title: "Ikkinchi slayd",
    description: "Ikkinchi slayd tavsifi.",
    ctaLabel: "Chegirmalar",
    ctaTarget: "#sale",
    image: "https://images.pexels.com/photos/931178/pexels-photo-931178.jpeg",
  },
  {
    id: "gift",
    eyebrow: "Sovg‘a",
    title: "Uchinchi slayd",
    description: "Uchinchi slayd tavsifi.",
    ctaLabel: "Sovg‘alar",
    ctaTarget: "#gift",
    image: "https://images.pexels.com/photos/931179/pexels-photo-931179.jpeg",
  },
];

function renderCarousel(onNavigate = vi.fn()) {
  renderWithIntl(<HeroCarousel slides={SLIDES} onNavigate={onNavigate} />, {
    locale: "uz",
  });
  return onNavigate;
}

/**
 * Reduced-motion is read once on mount, so the stub must exist before render.
 * The descriptor is restored afterwards to keep jsdom shared across test files.
 */
function stubReducedMotion(prefersReduced: boolean) {
  const original = Object.getOwnPropertyDescriptor(window, "matchMedia");

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: prefersReduced }),
  });

  return () => {
    if (original) {
      Object.defineProperty(window, "matchMedia", original);
    } else {
      Reflect.deleteProperty(window, "matchMedia");
    }
  };
}

function activeHeading() {
  return screen.getByRole("heading", { level: 1 }).textContent;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("HeroCarousel", () => {
  it("wraps the previous control from the first slide to the last slide", async () => {
    const user = userEvent.setup();
    renderCarousel();

    await user.click(screen.getByRole("button", { name: /oldingi slayd/i }));

    expect(activeHeading()).toBe("Uchinchi slayd");
  });

  it("advances and wraps forward from the last slide to the first", async () => {
    const user = userEvent.setup();
    renderCarousel();

    const next = screen.getByRole("button", { name: /keyingi slayd/i });
    await user.click(next);
    await user.click(next);
    expect(activeHeading()).toBe("Uchinchi slayd");

    await user.click(next);
    expect(activeHeading()).toBe("Birinchi slayd");
  });

  it("changes the active slide from a dot control and marks it current", async () => {
    const user = userEvent.setup();
    renderCarousel();

    await user.click(screen.getByRole("button", { name: /2-slaydga o‘tish/i }));

    expect(activeHeading()).toBe("Ikkinchi slayd");
    expect(
      screen.getByRole("button", { name: /2-slaydga o‘tish/i })
    ).toHaveAttribute("aria-current", "true");
  });

  it("runs the CTA target of the slide that is actually visible", async () => {
    const user = userEvent.setup();
    const onNavigate = renderCarousel();

    await user.click(screen.getByRole("button", { name: /2-slaydga o‘tish/i }));
    await user.click(screen.getByRole("button", { name: /chegirmalar/i }));

    expect(onNavigate).toHaveBeenCalledWith("#sale");
  });

  it("auto-advances after seven seconds when reduced motion is not requested", () => {
    const restore = stubReducedMotion(false);
    vi.useFakeTimers();

    try {
      renderCarousel();

      act(() => vi.advanceTimersByTime(7000));

      expect(activeHeading()).toBe("Ikkinchi slayd");
    } finally {
      restore();
    }
  });

  // fireEvent, not userEvent: userEvent's own timers deadlock against fake timers.
  it("pauses auto-advance and restarts it when resumed", () => {
    const restore = stubReducedMotion(false);
    vi.useFakeTimers();

    try {
      renderCarousel();

      fireEvent.click(
        screen.getByRole("button", { name: /karuselni pauza qilish/i })
      );
      act(() => vi.advanceTimersByTime(7000));
      expect(activeHeading()).toBe("Birinchi slayd");

      fireEvent.click(
        screen.getByRole("button", { name: /karuselni davom ettirish/i })
      );
      act(() => vi.advanceTimersByTime(7000));

      expect(activeHeading()).toBe("Ikkinchi slayd");
    } finally {
      restore();
    }
  });

  it("keeps the hero still when reduced motion is requested", () => {
    const restore = stubReducedMotion(true);
    vi.useFakeTimers();

    try {
      renderCarousel();

      act(() => vi.advanceTimersByTime(7000));

      expect(activeHeading()).toBe("Birinchi slayd");
    } finally {
      restore();
    }
  });

  it("renders nothing when there are no slides", () => {
    renderWithIntl(<HeroCarousel slides={[]} onNavigate={vi.fn()} />, {
      locale: "uz",
    });

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });
});
