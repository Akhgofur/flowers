import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { applyImageFallback } from "../../shared/image-fallback";
import type { HeroSlide } from "../../shared/types";

export type HeroCarouselProps = {
  slides: readonly HeroSlide[];
  onNavigate: (targetId: HeroSlide["ctaTarget"]) => void;
};

export function HeroCarousel({ slides, onNavigate }: HeroCarouselProps) {
  const t = useTranslations("Hero");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlayPaused, setIsAutoPlayPaused] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    setIsAutoPlayPaused(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (slides.length < 2 || isAutoPlayPaused) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % slides.length);
    }, 7000);

    return () => window.clearInterval(intervalId);
  }, [isAutoPlayPaused, slides.length]);

  if (slides.length === 0) return null;

  const activeSlide = slides[activeIndex];
  const showPrevious = () => {
    setActiveIndex((currentIndex) => (currentIndex - 1 + slides.length) % slides.length);
  };
  const showNext = () => {
    setActiveIndex((currentIndex) => (currentIndex + 1) % slides.length);
  };

  return (
    <section className="hero" aria-roledescription="carousel" aria-label={t("carouselLabel")}>
      <div className="shell hero__layout">
        <div className="hero__content" aria-live="polite">
          <p className="eyebrow">{activeSlide.eyebrow}</p>
          <h1>{activeSlide.title}</h1>
          <p className="hero__description">{activeSlide.description}</p>
          <button
            className="primary-button"
            type="button"
            onClick={() => onNavigate(activeSlide.ctaTarget)}
          >
            {activeSlide.ctaLabel}
            <span aria-hidden="true">↗</span>
          </button>

          <div className="hero__controls">
            <button
              className="carousel-arrow"
              type="button"
              aria-label={t("previous")}
              onClick={showPrevious}
            >
              <span aria-hidden="true">←</span>
            </button>
            <div className="carousel-dots" aria-label={t("dotsLabel")}>
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  className="carousel-dot"
                  type="button"
                  aria-label={t("goToSlide", { number: index + 1 })}
                  aria-current={index === activeIndex ? "true" : undefined}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </div>
            <button
              className="carousel-arrow"
              type="button"
              aria-label={t("next")}
              onClick={showNext}
            >
              <span aria-hidden="true">→</span>
            </button>
            <button
              className="carousel-toggle"
              type="button"
              onClick={() => setIsAutoPlayPaused((isPaused) => !isPaused)}
            >
              <span aria-hidden="true">{isAutoPlayPaused ? "▶" : "Ⅱ"}</span>
              {isAutoPlayPaused ? t("resume") : t("pause")}
            </button>
          </div>
        </div>

        <div className="hero__visual">
          <div className="hero__image-frame">
            <img
              key={activeSlide.id}
              src={activeSlide.image}
              alt={t("imageAlt", { title: activeSlide.title })}
              onError={applyImageFallback}
            />
          </div>
          <p className="hero__note">
            <span aria-hidden="true">✦</span>
            {t("freshNote")}
          </p>
        </div>
      </div>
    </section>
  );
}
