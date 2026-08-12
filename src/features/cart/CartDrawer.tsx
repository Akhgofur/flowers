import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatSum } from "../../shared/format";
import { applyImageFallback } from "../../shared/image-fallback";
import { useFocusTrap } from "../../shared/a11y/useFocusTrap";
import type { CartLine, Product } from "../../shared/types";
import type { Locale } from "@/i18n/config";

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
  const locale = useLocale() as Locale;
  const t = useTranslations("Cart");
  const tProduct = useTranslations("Product");
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
    (sum, { line, product }) => sum + (product.price ?? 0) * line.quantity,
    0
  );
  const hasPricedLine = items.some(({ product }) => product.price !== undefined);
  const hasUnpricedLine = items.some(({ product }) => product.price === undefined);
  const isMixedCart = hasPricedLine && hasUnpricedLine;

  useLayoutEffect(() => {
    if (open) shouldRestoreFocusRef.current = true;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
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
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="cart-drawer__header">
          <div>
            <p className="eyebrow">{t("selectionKicker")}</p>
            <h2>{t("title")}</h2>
          </div>
          <button
            ref={closeButtonRef}
            className="overlay-close-button"
            type="button"
            aria-label={t("close")}
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        {items.length === 0 ? (
          <div className="cart-drawer__empty">
            <span aria-hidden="true">♡</span>
            <h3>{t("empty")}</h3>
            <p>{t("emptyDescription")}</p>
            <button
              className="secondary-button"
              type="button"
              onClick={handleContinueShopping}
            >
              {t("browseCatalog")}
            </button>
          </div>
        ) : (
          <>
            <div className="cart-drawer__lines">
              {items.map(({ line, product }) => (
                <article className="cart-line" key={product.id}>
                  <img
                    src={product.image}
                    alt={t("itemImageAlt", { name: product.name })}
                    onError={applyImageFallback}
                  />
                  <div className="cart-line__content">
                    <div className="cart-line__heading">
                      <h3>{product.name}</h3>
                      <button
                        type="button"
                        aria-label={t("remove", { name: product.name })}
                        onClick={() => onRemove(product.id)}
                      >
                        {t("removeShort")}
                      </button>
                    </div>
                    <p>
                      {product.price === undefined
                        ? tProduct("priceOnRequest")
                        : `${formatSum(product.price, locale)} / ${t("each")}`}
                    </p>
                    <div className="cart-line__footer">
                      <div className="quantity-control quantity-control--compact">
                        <button
                          type="button"
                          aria-label={t("decrease", { name: product.name })}
                          onClick={() =>
                            onSetQuantity(product.id, line.quantity - 1)
                          }
                        >
                          <span aria-hidden="true">−</span>
                        </button>
                        <span aria-label={t("quantityLabel", { name: product.name })}>
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={t("increase", { name: product.name })}
                          disabled={line.quantity === 99}
                          onClick={() =>
                            onSetQuantity(product.id, line.quantity + 1)
                          }
                        >
                          <span aria-hidden="true">+</span>
                        </button>
                      </div>
                      <strong>
                        {product.price === undefined
                          ? tProduct("priceOnRequest")
                          : formatSum(product.price * line.quantity, locale)}
                      </strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <footer className="cart-drawer__footer">
              <div className="cart-drawer__total">
                <span>{t("subtotal")}</span>
                {!hasPricedLine ? (
                  <strong>{tProduct("priceOnRequest")}</strong>
                ) : isMixedCart ? (
                  <span className="cart-drawer__total-amount">
                    <strong>{formatSum(total, locale)}</strong>
                    <small className="cart-drawer__total-note">
                      {tProduct("priceOnRequest")}
                    </small>
                  </span>
                ) : (
                  <strong>{formatSum(total, locale)}</strong>
                )}
              </div>
              <Link
                className="primary-button"
                href="/checkout"
              >
                {t("checkout")}
              </Link>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
