"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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

export type ProductDetailProps = {
  product: CatalogProduct;
};

export function ProductDetail({ product }: ProductDetailProps) {
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
        ? `${product.name} sevimlilardan olib tashlandi.`
        : `${product.name} sevimlilarga qo‘shildi.`
    );
  };

  const addProductToCart = () => {
    const nextLines = addToCart(readCart(), product.id, quantity);
    writeCart(nextLines);
    setStatus(`${product.name} savatga qo‘shildi.`);
  };

  const imageAlt = product.images[0]?.alt ?? `${product.name} gul kompozitsiyasi`;

  return (
    <main className="product-detail shell" aria-labelledby="product-detail-title">
      <nav className="product-detail__breadcrumb" aria-label="Yo‘l ko‘rsatkich">
        <Link href="/">Bosh sahifa</Link>
        <span aria-hidden="true">/</span>
        <Link href="/catalog">Gullar</Link>
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
          {product.isOnSale ? <span className="product-detail__badge">Aksiya</span> : null}
        </div>

        <div className="product-detail__content">
          <p className="eyebrow">{product.categorySlug}</p>
          <h1 id="product-detail-title">{product.name}</h1>
          <p className="product-detail__description">{product.description}</p>

          <div className="product-detail__price">
            <strong>{formatSum(product.price)}</strong>
            {product.originalPrice ? <s>{formatSum(product.originalPrice)}</s> : null}
          </div>

          <dl className="product-detail__facts">
            <div>
              <dt>Tarkibi</dt>
              <dd>{product.composition.join(" · ")}</dd>
            </div>
            <div>
              <dt>Yetkazib berish</dt>
              <dd>{product.deliveryEstimate ?? "Buyurtma paytida aniqlanadi"}</dd>
            </div>
            <div>
              <dt>O‘lchami</dt>
              <dd>{product.size ?? "Aniqlashtiriladi"}</dd>
            </div>
          </dl>

          <div className="product-detail__actions">
            <div className="quantity-control" aria-label="Mahsulot miqdori">
              <button
                type="button"
                aria-label="Miqdorni kamaytirish"
                disabled={quantity === 1}
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              >
                <span aria-hidden="true">−</span>
              </button>
              <span aria-label="Miqdor">{quantity}</span>
              <button
                type="button"
                aria-label="Miqdorni oshirish"
                disabled={quantity === 99}
                onClick={() => setQuantity((current) => Math.min(99, current + 1))}
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>
            <button className="primary-button" type="button" onClick={addProductToCart}>
              Savatga qo‘shish
            </button>
            <button
              className="product-detail__favorite"
              type="button"
              aria-pressed={isFavorite}
              onClick={toggleFavorite}
            >
              {isFavorite ? "Sevimlilardan olib tashlash" : "Sevimlilarga qo‘shish"}
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
