"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  readCart,
  writeCart,
} from "@/features/cart/cart-storage";
import { removeFromCart, setCartQuantity } from "@/features/cart/cart-reducer";
import type { CatalogProduct, CheckoutInput, OrderCreationResult } from "@/lib/contracts";
import { formatSum } from "@/shared/format";
import { applyImageFallback, IMAGE_FALLBACK_URL } from "@/shared/image-fallback";
import type { CartLine } from "@/shared/types";
import type { Locale } from "@/i18n/config";

type CheckoutClientProps = {
  products: readonly CatalogProduct[];
  isDemoCatalog?: boolean;
};

type CheckoutForm = Omit<CheckoutInput["customer"], "deliveryDate" | "comment"> & {
  deliveryDate: string;
  comment: string;
  paymentMethod: CheckoutInput["paymentMethod"];
};

type CheckoutResponse = { order?: OrderCreationResult; error?: string };

function isPricedProduct(
  product: CatalogProduct | undefined
): product is CatalogProduct & { price: number } {
  return product?.price !== undefined;
}

const EMPTY_FORM: CheckoutForm = {
  fullName: "",
  phone: "",
  address: "",
  deliveryDate: "",
  comment: "",
  paymentMethod: "cash_on_delivery",
};

function toCheckoutPayload(
  form: CheckoutForm,
  items: readonly CartLine[],
  locale: Locale
): CheckoutInput {
  return {
    locale,
    customer: {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      ...(form.deliveryDate ? { deliveryDate: form.deliveryDate } : {}),
      ...(form.comment.trim() ? { comment: form.comment.trim() } : {}),
    },
    paymentMethod: form.paymentMethod,
    items: items.map((item) => ({ ...item })),
  };
}

async function readCheckoutResponse(response: Response): Promise<CheckoutResponse> {
  try {
    return (await response.json()) as CheckoutResponse;
  } catch {
    return {};
  }
}

export function CheckoutClient({ products, isDemoCatalog = false }: CheckoutClientProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Checkout");
  const tHeader = useTranslations("Header");
  const tProduct = useTranslations("Product");
  const productIds = useMemo(() => new Set(products.map((product) => product.id)), [products]);
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<OrderCreationResult | null>(null);

  useEffect(() => {
    // Browser-only cart storage must be read after SSR hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLines(readCart(productIds));
    setIsHydrated(true);
  }, [productIds]);

  useEffect(() => {
    if (isHydrated) writeCart(lines);
  }, [isHydrated, lines]);

  const items = useMemo(
    () =>
      lines.flatMap((line) => {
        const product = productsById.get(line.productId);
        return isPricedProduct(product) ? [{ line, product }] : [];
      }),
    [lines, productsById]
  );
  const subtotal = items.reduce(
    (sum, { line, product }) => sum + product.price * line.quantity,
    0
  );

  const updateForm = <Key extends keyof CheckoutForm>(key: Key, value: CheckoutForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setLines((current) => setCartQuantity(current, productId, quantity));
    setError(null);
  };

  const removeLine = (productId: string) => {
    setLines((current) => removeFromCart(current, productId));
    setError(null);
  };

  const submitOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || items.length === 0 || isDemoCatalog) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(toCheckoutPayload(form, lines, locale)),
      });
      const payload = await readCheckoutResponse(response);

      if (!response.ok || !payload.order) {
        throw new Error(
          payload.error ?? t("errorService")
        );
      }

      setCreatedOrder(payload.order);
      setLines([]);
      writeCart([]);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("errorService")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdOrder) {
    return (
      <main className="checkout-page">
        <div className="shell checkout-confirmation" aria-labelledby="order-success-title">
          <span className="checkout-confirmation__mark" aria-hidden="true">✓</span>
          <p className="eyebrow">{t("successTitle")}</p>
          <h1 id="order-success-title">{t("successHeadline")}</h1>
          <p>{t("successDescription", { number: createdOrder.orderNumber })}</p>
          <dl className="checkout-confirmation__summary">
            <div>
              <dt>{t("status")}</dt>
              <dd>{t("statusPending")}</dd>
            </div>
            <div>
              <dt>{t("finalTotal")}</dt>
              <dd>{formatSum(createdOrder.total, locale)}</dd>
            </div>
          </dl>
          <Link href="/catalog" className="primary-button">
            {t("continueShopping")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <header className="checkout-header">
        <div className="shell checkout-header__inner">
          <Link className="wordmark" href="/" aria-label={tHeader("homeLabel")}>
            <Image
              className="wordmark__image"
              src="/brand/floraluxe-logo.jpg"
              alt="Floraluxe"
              width={320}
              height={120}
              priority
            />
          </Link>
          <Link className="checkout-back-link" href="/catalog">
            ← {t("backCatalog")}
          </Link>
        </div>
      </header>

      <div className="shell checkout-layout">
        <section className="checkout-intro" aria-labelledby="checkout-title">
          <p className="eyebrow">{t("kicker")}</p>
          <h1 id="checkout-title">{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </section>

        {isDemoCatalog ? (
          <p className="checkout-demo-notice" role="status">
            {t("demoNotice")}
          </p>
        ) : null}

        {!isHydrated ? (
          <div className="checkout-loading" aria-live="polite">{t("loading")}</div>
        ) : items.length === 0 ? (
          <section className="checkout-empty" aria-labelledby="checkout-empty-title">
            <span aria-hidden="true">♡</span>
            <h2 id="checkout-empty-title">{t("empty")}</h2>
            <p>{t("emptyDescription")}</p>
            <Link href="/catalog" className="primary-button">{t("goCatalog")}</Link>
          </section>
        ) : (
          <form className="checkout-form" onSubmit={submitOrder}>
            <section className="checkout-form__panel" aria-labelledby="customer-title">
              <div className="checkout-section-heading">
                <span>01</span>
                <div>
                  <h2 id="customer-title">{t("customerTitle")}</h2>
                  <p>{t("customerHelp")}</p>
                </div>
              </div>

              <div className="checkout-fields">
                <label>
                  <span>{t("fullName")}</span>
                  <input
                    required
                    name="fullName"
                    autoComplete="name"
                    value={form.fullName}
                    onChange={(event) => updateForm("fullName", event.target.value)}
                    placeholder={t("fullNamePlaceholder")}
                  />
                </label>
                <label>
                  <span>{t("phone")}</span>
                  <input
                    required
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(event) => updateForm("phone", event.target.value)}
                    placeholder="+998 90 123 45 67"
                  />
                </label>
                <label className="checkout-fields__full">
                  <span>{t("address")}</span>
                  <textarea
                    required
                    name="address"
                    autoComplete="street-address"
                    rows={3}
                    value={form.address}
                    onChange={(event) => updateForm("address", event.target.value)}
                    placeholder={t("addressPlaceholder")}
                  />
                </label>
                <label>
                  <span>{t("deliveryDate")} <em>({t("optional")})</em></span>
                  <input
                    name="deliveryDate"
                    type="date"
                    value={form.deliveryDate}
                    onChange={(event) => updateForm("deliveryDate", event.target.value)}
                  />
                </label>
                <label>
                  <span>{t("comment")} <em>({t("optional")})</em></span>
                  <input
                    name="comment"
                    value={form.comment}
                    onChange={(event) => updateForm("comment", event.target.value)}
                    placeholder={t("commentPlaceholder")}
                  />
                </label>
              </div>
            </section>

            <section className="checkout-form__panel" aria-labelledby="payment-title">
              <div className="checkout-section-heading">
                <span>02</span>
                <div>
                  <h2 id="payment-title">{t("payment")}</h2>
                  <p>{t("paymentHelp")}</p>
                </div>
              </div>
              <div className="checkout-payment-options" role="radiogroup" aria-label={t("paymentLabel")}>
                <label data-selected={form.paymentMethod === "cash_on_delivery"}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash_on_delivery"
                    checked={form.paymentMethod === "cash_on_delivery"}
                    onChange={() => updateForm("paymentMethod", "cash_on_delivery")}
                  />
                  <span aria-hidden="true">₸</span>
                  <strong>{t("cashOnDelivery")}</strong>
                  <small>{t("cashHelp")}</small>
                </label>
                <label data-selected={form.paymentMethod === "card_on_delivery"}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card_on_delivery"
                    checked={form.paymentMethod === "card_on_delivery"}
                    onChange={() => updateForm("paymentMethod", "card_on_delivery")}
                  />
                  <span aria-hidden="true">▣</span>
                  <strong>{t("cardOnDelivery")}</strong>
                  <small>{t("cardHelp")}</small>
                </label>
              </div>
            </section>

            <section className="checkout-submit-panel">
              <p>
                {t("consent")}
              </p>
              {error ? <p className="checkout-error" role="alert">{error}</p> : null}
              <button
                type="submit"
                className="primary-button checkout-submit-button"
                disabled={isSubmitting || isDemoCatalog}
              >
                {isSubmitting ? t("submitting") : t("submit")}
              </button>
            </section>
          </form>
        )}

        {items.length > 0 ? (
          <aside className="checkout-summary" aria-labelledby="summary-title">
            <div className="checkout-summary__heading">
              <p className="eyebrow">{t("selectionKicker")}</p>
              <h2 id="summary-title">{t("summary")}</h2>
            </div>
            <div className="checkout-summary__lines">
              {items.map(({ line, product }) => (
                <article key={product.id} className="checkout-summary-line">
                  <Image
                    src={product.images[0]?.url ?? IMAGE_FALLBACK_URL}
                    alt={product.images[0]?.alt ?? product.name}
                    width={68}
                    height={82}
                    sizes="68px"
                    onError={applyImageFallback}
                  />
                  <div>
                    <h3>{product.name}</h3>
                    <p>{formatSum(product.price, locale)} / {t("each")}</p>
                    <div className="checkout-line-actions">
                      <div className="quantity-control quantity-control--compact" aria-label={t("quantityLabel", { name: product.name })}>
                        <button
                          type="button"
                          aria-label={`${tProduct("decreaseQuantity")}: ${product.name}`}
                          onClick={() => updateQuantity(product.id, line.quantity - 1)}
                        >
                          <span aria-hidden="true">−</span>
                        </button>
                        <span>{line.quantity}</span>
                        <button
                          type="button"
                          aria-label={`${tProduct("increaseQuantity")}: ${product.name}`}
                          disabled={line.quantity >= 99}
                          onClick={() => updateQuantity(product.id, line.quantity + 1)}
                        >
                          <span aria-hidden="true">+</span>
                        </button>
                      </div>
                      <button
                        type="button"
                        className="checkout-remove"
                        onClick={() => removeLine(product.id)}
                      >
                        {t("remove")}
                      </button>
                    </div>
                  </div>
                  <strong>{formatSum(product.price * line.quantity, locale)}</strong>
                </article>
              ))}
            </div>
            <dl className="checkout-total">
              <div>
                <dt>{t("productsSubtotal")}</dt>
                <dd>{formatSum(subtotal, locale)}</dd>
              </div>
              <div className="checkout-total__grand">
                <dt>{t("finalTotal")}</dt>
                <dd>{t("totalPending")}</dd>
              </div>
            </dl>
            <p className="checkout-summary__note">
              {t("serverCalculated")}
            </p>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
