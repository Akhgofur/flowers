import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { formatSum } from "../../shared/format";
import { applyImageFallback } from "../../shared/image-fallback";
import { useFocusTrap } from "../../shared/a11y/useFocusTrap";
import type { Product } from "../../shared/types";
import { FavoriteButton } from "./FavoriteButton";

export type ProductQuickViewProps = {
  product: Product | null;
  open: boolean;
  isFavorite: boolean;
  restoreFocusTarget: HTMLElement | null;
  onClose: () => void;
  onAdd: (productId: string, quantity: number) => void;
  onToggleFavorite: (productId: string) => void;
};

export function ProductQuickView({
  product,
  open,
  isFavorite,
  restoreFocusTarget,
  onClose,
  onAdd,
  onToggleFavorite,
}: ProductQuickViewProps) {
  const [quantity, setQuantity] = useState(1);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || !product) return;
    setQuantity(1);
  }, [open, product, onClose]);

  useFocusTrap({
    active: open && product !== null,
    containerRef: dialogRef,
    initialFocusRef: closeButtonRef,
    restoreFocusTarget,
    onEscape: onClose,
  });

  if (!open || !product) return null;

  return (
    <div className="quick-view-backdrop" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="quick-view"
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          className="overlay-close-button"
          type="button"
          aria-label="Mahsulot oynasini yopish"
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>

        <div className="quick-view__visual">
          <img
            src={product.image}
            alt={`${product.name} gul kompozitsiyasi`}
            onError={applyImageFallback}
          />
        </div>

        <div className="quick-view__content">
          <div className="quick-view__heading">
            <div>
              <p className="eyebrow">Nafis kolleksiyasi</p>
              <h2>{product.name}</h2>
            </div>
            <FavoriteButton
              product={product}
              isFavorite={isFavorite}
              onToggle={onToggleFavorite}
            />
          </div>

          <div className="quick-view__price">
            <strong>{formatSum(product.price)}</strong>
            {product.originalPrice ? (
              <s>{formatSum(product.originalPrice)}</s>
            ) : null}
          </div>
          <p className="quick-view__description">{product.shortDescription}</p>
          <Link
            className="quick-view__detail-link"
            href={`/products/${product.slug ?? product.id}`}
          >
            To‘liq tavsif va buyurtma sahifasi
          </Link>

          <dl className="quick-view__details">
            <div>
              <dt>Tarkibi</dt>
              <dd>{product.composition.join(" · ")}</dd>
            </div>
            <div>
              <dt>Yetkazish</dt>
              <dd>{product.deliveryEstimate}</dd>
            </div>
            <div>
              <dt>O'lchami</dt>
              <dd>{product.size}</dd>
            </div>
          </dl>

          <div className="quick-view__purchase">
            <div className="quantity-control">
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
            <button
              className="primary-button quick-view__add"
              type="button"
              onClick={() => onAdd(product.id, quantity)}
            >
              Savatga qo'shish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
