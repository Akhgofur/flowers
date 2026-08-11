"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import type { CatalogProduct } from "@/lib/contracts";
import { formatSum } from "@/shared/format";
import { IMAGE_FALLBACK_URL } from "@/shared/image-fallback";

export type ProductRailProps = {
  title: string;
  description?: string;
  products: readonly CatalogProduct[];
};

export function ProductRail({ title, description, products }: ProductRailProps) {
  const locale = useLocale() as Locale;
  const tHero = useTranslations("Hero");
  const tProduct = useTranslations("Product");
  const railRef = useRef<HTMLDivElement>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(products.length > 1);

  const syncBoundaries = () => {
    const rail = railRef.current;
    if (!rail) return;
    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    setCanGoBack(rail.scrollLeft > 4);
    setCanGoForward(rail.scrollLeft < maxScroll - 4);
  };

  useEffect(() => {
    syncBoundaries();
    window.addEventListener("resize", syncBoundaries);
    return () => window.removeEventListener("resize", syncBoundaries);
  }, [products.length]);

  if (products.length === 0) return null;

  const move = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * Math.max(rail.clientWidth * 0.82, 280),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  return (
    <section className="product-rail-section" aria-labelledby={`rail-${title}`}>
      <div className="shell product-rail-heading">
        <div>
          <p className="eyebrow">FLORALUXE EDIT</p>
          <h2 id={`rail-${title}`}>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        <div className="product-rail-controls">
          <button
            type="button"
            aria-label={tHero("previous")}
            disabled={!canGoBack}
            onClick={() => move(-1)}
          >
            ←
          </button>
          <button
            type="button"
            aria-label={tHero("next")}
            disabled={!canGoForward}
            onClick={() => move(1)}
          >
            →
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        className="shell product-rail"
        onScroll={syncBoundaries}
      >
        {products.map((product) => (
          <article className="rail-product-card" key={product.id}>
            <Link
              className="rail-product-card__link"
              href={`/products/${product.slug}`}
              aria-label={`${product.name} — ${tProduct("detailLink")}`}
            >
              <span className="rail-product-card__media">
                <Image
                  src={product.images[0]?.url ?? IMAGE_FALLBACK_URL}
                  alt={product.images[0]?.alt ?? product.name}
                  fill
                  sizes="(max-width: 520px) 44vw, (max-width: 900px) 31vw, 280px"
                />
                {product.isOnSale ? <span>{tProduct("saleBadge")}</span> : null}
              </span>
              <span className="rail-product-card__body">
                <span>{product.categorySlug}</span>
                <strong className="rail-product-card__title">{product.name}</strong>
                <strong>
                  {product.price === undefined
                    ? tProduct("priceOnRequest")
                    : formatSum(product.price, locale)}
                </strong>
              </span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
