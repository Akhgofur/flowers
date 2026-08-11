import { Link } from "@/i18n/navigation";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { formatSum } from "../../shared/format";
import { applyImageFallback } from "../../shared/image-fallback";
import { useFocusTrap } from "../../shared/a11y/useFocusTrap";
import type { CartLine, Product } from "../../shared/types";

export type CartDrawerProps = {
  open: boolean;
  lines: readonly CartLine[];
  products: readonly Product[];
  restoreFocusTarget: HTMLElement | null;
  onClose: () => void;
  onSetQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onContinueShopping: () => void;
};

export function CartDrawer({
  open,
  lines,
  products,
  restoreFocusTarget,
  onClose,
  onSetQuantity,
  onRemove,
  onContinueShopping,
}: CartDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const shouldRestoreFocusRef = useRef(true);

  const shouldRestoreFocus = useCallback(
    () => shouldRestoreFocusRef.current,
    []
  );

  const items = useMemo(() => {
    const productsById = new Map(products.map((product) => [product.id, product]));

    return lines.flatMap((line) => {
      const product = productsById.get(line.productId);
      return product ? [{ line, product }] : [];
    });
  }, [lines, products]);

  const total = items.reduce(
    (sum, { line, product }) => sum + line.quantity * product.price,
    0
  );

  useLayoutEffect(() => {
    if (open) shouldRestoreFocusRef.current = true;
  }, [open]);

  useFocusTrap({
    active: open,
    containerRef: drawerRef,
    initialFocusRef: closeButtonRef,
    restoreFocusTarget,
    shouldRestoreFocus,
    onEscape: onClose,
  });

  const handleContinueShopping = () => {
    shouldRestoreFocusRef.current = false;
    onContinueShopping();
  };

  if (!open) return null;

  return (
    <div className="cart-drawer-backdrop" onMouseDown={onClose}>
      <aside
        ref={drawerRef}
        id="cart-drawer"
        className="cart-drawer"
        role="complementary"
        aria-label="Savat"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="cart-drawer__header">
          <div>
            <p className="eyebrow">Sizning tanlovingiz</p>
            <h2>Savat</h2>
          </div>
          <button
            ref={closeButtonRef}
            className="overlay-close-button"
            type="button"
            aria-label="Savatni yopish"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        {items.length === 0 ? (
          <div className="cart-drawer__empty">
            <span aria-hidden="true">♡</span>
            <h3>Savatingiz hozircha bo'sh</h3>
            <p>Yoqtirgan buketingizni tanlang — biz uni mehr bilan tayyorlaymiz.</p>
            <button
              className="secondary-button"
              type="button"
              onClick={handleContinueShopping}
            >
              Katalogga qaytish
            </button>
          </div>
        ) : (
          <>
            <div className="cart-drawer__lines">
              {items.map(({ line, product }) => (
                <article className="cart-line" key={product.id}>
                  <img
                    src={product.image}
                    alt={`${product.name} gul kompozitsiyasi`}
                    onError={applyImageFallback}
                  />
                  <div className="cart-line__content">
                    <div className="cart-line__heading">
                      <h3>{product.name}</h3>
                      <button
                        type="button"
                        aria-label={`${product.name}ni savatdan olib tashlash`}
                        onClick={() => onRemove(product.id)}
                      >
                        Olib tashlash
                      </button>
                    </div>
                    <p>{formatSum(product.price)} / dona</p>
                    <div className="cart-line__footer">
                      <div className="quantity-control quantity-control--compact">
                        <button
                          type="button"
                          aria-label={`${product.name} miqdorini kamaytirish`}
                          onClick={() =>
                            onSetQuantity(product.id, line.quantity - 1)
                          }
                        >
                          <span aria-hidden="true">−</span>
                        </button>
                        <span aria-label={`${product.name} miqdori`}>
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`${product.name} miqdorini oshirish`}
                          disabled={line.quantity === 99}
                          onClick={() =>
                            onSetQuantity(product.id, line.quantity + 1)
                          }
                        >
                          <span aria-hidden="true">+</span>
                        </button>
                      </div>
                      <strong>{formatSum(product.price * line.quantity)}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <footer className="cart-drawer__footer">
              <div className="cart-drawer__total">
                <span>Jami</span>
                <strong>{formatSum(total)}</strong>
              </div>
              <Link
                className="primary-button"
                href="/checkout"
              >
                Buyurtmani rasmiylashtirish
              </Link>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
