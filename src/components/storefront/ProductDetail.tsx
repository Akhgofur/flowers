"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type {
  CatalogProduct,
  ProductAvailability,
  PublicSiteSettings,
} from "@/lib/contracts";
import { addToCart } from "@/features/cart/cart-reducer";
import {
  readCart,
  readFavorites,
  writeCart,
  writeFavorites,
} from "@/features/cart/cart-storage";
import { formatSum } from "@/shared/format";
import { applyImageFallback, IMAGE_FALLBACK_URL } from "@/shared/image-fallback";
import type { Locale } from "@/i18n/config";
import { getProductAvailability } from "@/lib/product-availability";
import { useOptionalStorefront } from "./StorefrontFrame";

export type ProductDetailProps = {
  product: CatalogProduct;
  availability?: ProductAvailability;
  settings?: PublicSiteSettings;
  productUrl?: string;
};

export function ProductDetail({
  product,
  availability = getProductAvailability(product, new Date()),
  settings,
  productUrl,
}: ProductDetailProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Product");
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageSource, setImageSource] = useState(
    product.images[0]?.url ?? IMAGE_FALLBACK_URL
  );
  const storefront = useOptionalStorefront();

  useEffect(() => {
    // Storage is intentionally read after hydration so a returning visitor's
    // favorites cannot make the server and first client render disagree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsFavorite(readFavorites().includes(product.id));
  }, [product.id]);

  const toggleFavorite = () => {
    if (storefront) {
      storefront.toggleFavorite(product.id);
      return;
    }
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
    if (storefront) {
      storefront.addProduct(product.id, quantity);
      setStatus(t("addedToCart", { name: product.name }));
      return;
    }
    const nextLines = addToCart(readCart(), product.id, quantity);
    writeCart(nextLines);
    setStatus(t("addedToCart", { name: product.name }));
  };

  const selectedImage = product.images[selectedImageIndex] ?? product.images[0];
  const imageAlt = selectedImage?.alt ?? t("imageAlt", {
    name: product.name,
    number: selectedImageIndex + 1,
  });
  const selectImage = (index: number) => {
    const image = product.images[index];
    if (!image) return;
    setSelectedImageIndex(index);
    setImageSource(image.url);
  };
  const favorite = storefront
    ? storefront.favoriteIds.includes(product.id)
    : isFavorite;
  const inquiryText = `${product.name} — ${t("askAvailability")}`;
  const inquiryHref = settings?.telegramUrl
    ? `${settings.telegramUrl}${settings.telegramUrl.includes("?") ? "&" : "?"}text=${encodeURIComponent(
        `${inquiryText}${productUrl ? `\n${productUrl}` : ""}`
      )}`
    : settings?.phone
      ? `tel:${settings.phone.replace(/[^+\d]/g, "")}`
      : "/catalog";

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
        <div className="product-detail__gallery">
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
            {product.images.length > 1 ? (
              <div className="product-detail__image-navigation">
                <button
                  type="button"
                  aria-label={t("previousImage")}
                  onClick={() => selectImage((selectedImageIndex - 1 + product.images.length) % product.images.length)}
                >
                  <span aria-hidden="true">←</span>
                </button>
                <span>{selectedImageIndex + 1} / {product.images.length}</span>
                <button
                  type="button"
                  aria-label={t("nextImage")}
                  onClick={() => selectImage((selectedImageIndex + 1) % product.images.length)}
                >
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            ) : null}
          </div>
          {product.images.length > 1 ? (
            <div className="product-detail__thumbnails" aria-label={t("collection")}>
              {product.images.map((image, index) => (
                <button
                  key={`${image.url}-${index}`}
                  type="button"
                  aria-label={image.alt || t("imageAlt", { name: product.name, number: index + 1 })}
                  aria-pressed={index === selectedImageIndex}
                  onClick={() => selectImage(index)}
                >
                  <Image
                    src={image.url}
                    alt=""
                    width={74}
                    height={88}
                    sizes="74px"
                    onError={applyImageFallback}
                  />
                </button>
              ))}
            </div>
          ) : null}
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
          {/* Shown whether or not a figure is on display: a price quoted by the
              florist moves with the season just as a listed one does. */}
          <p className="product-detail__price-note">{t("seasonalPriceNote")}</p>

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
            {availability.available ? (
              <>
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
              </>
            ) : (
              <div className="product-detail__availability" role="status">
                <p>{t(`availability.${availability.reason}`)}</p>
                <a className="primary-button" href={inquiryHref}>
                  {t("askAvailability")}
                </a>
              </div>
            )}
            <button
              className="product-detail__favorite"
              type="button"
              aria-pressed={favorite}
              onClick={toggleFavorite}
            >
              {favorite ? t("removeFavorite") : t("favorite")}
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
