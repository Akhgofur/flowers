"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CatalogProduct } from "@/lib/contracts";
import { addToCart } from "@/features/cart/cart-reducer";
import {
  readCart,
  readFavorites,
  writeCart,
  writeFavorites,
} from "@/features/cart/cart-storage";
import { formatSum } from "@/shared/format";
import { IMAGE_FALLBACK_URL } from "@/shared/image-fallback";
import type { Locale } from "@/i18n/config";

export type ProductDetailProps = {
  product: CatalogProduct;
};

export function ProductDetail({ product }: ProductDetailProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Product");
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState(
    product.images[0]?.url ?? IMAGE_FALLBACK_URL
  );

  useEffect(() => {
    // Storage is intentionally read after hydration so a returning visitor's
    // favorites cannot make the server and first client render disagree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsFavorite(readFavorites().includes(product.id));
  }, [product.id]);

  const toggleFavorite = () => {
    const favoriteIds = readFavorites();
    const nextFavoriteIds = isFavorite
      ? favoriteIds.filter((id) => id !== product.id)
      : [...new Set([...favoriteIds, product.id])];

    writeFavorites(nextFavoriteIds);
    setIsFavorite(!isFavorite);
    setStatus(
      isFavorite
        ? t("removedFromFavorites", { name: product.name })
        : t("addedToFavorites", { name: product.name })
    );
  };

  const addProductToCart = () => {
    const nextLines = addToCart(readCart(), product.id, quantity);
    writeCart(nextLines);
    setStatus(t("addedToCart", { name: product.name }));
  };

  const imageAlt = product.images[0]?.alt ?? `${product.name} gul kompozitsiyasi`;

  return (
    <main className="product-detail shell" aria-labelledby="product-detail-title">
      <nav className="product-detail__breadcrumb" aria-label={t("catalog")}>
        <Link href="/">{t("home")}</Link>
        <span aria-hidden="true">/</span>
        <Link href="/catalog">{t("catalog")}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <article className="product-detail__layout">
        <div className="product-detail__image-frame">
          <Image
            src={imageSource}
            alt={imageAlt}
            fill
            priority
            sizes="(max-width: 760px) calc(100vw - 48px), 50vw"
            onError={() => setImageSource(IMAGE_FALLBACK_URL)}
          />
          {product.isOnSale ? <span className="product-detail__badge">{t("saleBadge")}</span> : null}
        </div>

        <div className="product-detail__content">
          <p className="eyebrow">{product.categorySlug}</p>
          <h1 id="product-detail-title">{product.name}</h1>
          <p className="product-detail__description">{product.description}</p>

          <div className="product-detail__price">
            <strong>
              {product.price === undefined
                ? t("priceOnRequest")
                : formatSum(product.price, locale)}
            </strong>
            {product.originalPrice ? <s>{formatSum(product.originalPrice, locale)}</s> : null}
          </div>

          <dl className="product-detail__facts">
            <div>
              <dt>{t("composition")}</dt>
              <dd>{product.composition.join(" · ")}</dd>
            </div>
            <div>
              <dt>{t("delivery")}</dt>
              <dd>{product.deliveryEstimate ?? t("unknownDelivery")}</dd>
            </div>
            <div>
              <dt>{t("size")}</dt>
              <dd>{product.size ?? t("unknownSize")}</dd>
            </div>
          </dl>

          <div className="product-detail__actions">
            {product.price === undefined ? null : <>
            <div className="quantity-control" aria-label={t("quantity")}>
              <button
                type="button"
                aria-label={t("decreaseQuantity")}
                disabled={quantity === 1}
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              >
                <span aria-hidden="true">−</span>
              </button>
              <span aria-label={t("quantityLabel")}>{quantity}</span>
              <button
                type="button"
                aria-label={t("increaseQuantity")}
                disabled={quantity === 99}
                onClick={() => setQuantity((current) => Math.min(99, current + 1))}
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>
            <button className="primary-button" type="button" onClick={addProductToCart}>
              {t("addToCart")}
            </button>
            </>}
            <button
              className="product-detail__favorite"
              type="button"
              aria-pressed={isFavorite}
              onClick={toggleFavorite}
            >
              {isFavorite ? t("removeFavorite") : t("favorite")}
            </button>
          </div>

          {status ? (
            <p className="product-detail__status" role="status">
              {status}
            </p>
          ) : null}
        </div>
      </article>
    </main>
  );
}
