"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  readCart,
  writeCart,
} from "@/features/cart/cart-storage";
import { removeFromCart, setCartQuantity } from "@/features/cart/cart-reducer";
import type { CatalogProduct, CheckoutInput, OrderCreationResult } from "@/lib/contracts";
import { formatSum } from "@/shared/format";
import { applyImageFallback, IMAGE_FALLBACK_URL } from "@/shared/image-fallback";
import type { CartLine } from "@/shared/types";

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

const EMPTY_FORM: CheckoutForm = {
  fullName: "",
  phone: "",
  address: "",
  deliveryDate: "",
  comment: "",
  paymentMethod: "cash_on_delivery",
};

function toCheckoutPayload(form: CheckoutForm, items: readonly CartLine[]): CheckoutInput {
  return {
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
        return product ? [{ line, product }] : [];
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
        body: JSON.stringify(toCheckoutPayload(form, lines)),
      });
      const payload = await readCheckoutResponse(response);

      if (!response.ok || !payload.order) {
        throw new Error(
          payload.error ?? "Buyurtmani yuborib bo'lmadi. Qayta urinib ko'ring."
        );
      }

      setCreatedOrder(payload.order);
      setLines([]);
      writeCart([]);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Buyurtmani yuborib bo'lmadi. Qayta urinib ko'ring."
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
          <p className="eyebrow">Buyurtma qabul qilindi</p>
          <h1 id="order-success-title">Gullaringizni tayyorlashni boshlaymiz</h1>
          <p>
            <strong>{createdOrder.orderNumber}</strong> raqamli buyurtmangiz qabul qilindi.
            Operator tez orada yetkazib berish vaqtini tasdiqlash uchun bog’lanadi.
          </p>
          <dl className="checkout-confirmation__summary">
            <div>
              <dt>Holat</dt>
              <dd>Qabul qilindi</dd>
            </div>
            <div>
              <dt>Yakuniy jami</dt>
              <dd>{formatSum(createdOrder.total)}</dd>
            </div>
          </dl>
          <Link href="/gullar" className="primary-button">
            Katalogga qaytish
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <header className="checkout-header">
        <div className="shell checkout-header__inner">
          <Link className="wordmark" href="/" aria-label="Nafis bosh sahifasi">
            <span className="wordmark__bloom" aria-hidden="true">✿</span>
            <span>Nafis</span>
            <small>gullar uyi</small>
          </Link>
          <Link className="checkout-back-link" href="/gullar">
            ← Katalogga qaytish
          </Link>
        </div>
      </header>

      <div className="shell checkout-layout">
        <section className="checkout-intro" aria-labelledby="checkout-title">
          <p className="eyebrow">Bir qadam qoldi</p>
          <h1 id="checkout-title">Buyurtmani rasmiylashtirish</h1>
          <p>
            Ma’lumotlaringizni qoldiring — florist buyurtmani va yetkazib berish vaqtini
            tasdiqlash uchun siz bilan bog’lanadi.
          </p>
        </section>

        {isDemoCatalog ? (
          <p className="checkout-demo-notice" role="status">
            Demo katalogi ko’rsatilmoqda. Haqiqiy buyurtma qabul qilish uchun MongoDB
            ma’lumotlar bazasini ulang va katalogni seed qiling.
          </p>
        ) : null}

        {!isHydrated ? (
          <div className="checkout-loading" aria-live="polite">Savatingiz yuklanmoqda…</div>
        ) : items.length === 0 ? (
          <section className="checkout-empty" aria-labelledby="checkout-empty-title">
            <span aria-hidden="true">♡</span>
            <h2 id="checkout-empty-title">Savatingiz hozircha bo’sh</h2>
            <p>Avval kayfiyatingizga mos kompozitsiyani tanlang.</p>
            <Link href="/gullar" className="primary-button">Gullarni ko’rish</Link>
          </section>
        ) : (
          <form className="checkout-form" onSubmit={submitOrder}>
            <section className="checkout-form__panel" aria-labelledby="customer-title">
              <div className="checkout-section-heading">
                <span>01</span>
                <div>
                  <h2 id="customer-title">Qabul qiluvchi ma’lumotlari</h2>
                  <p>Yetkazib berishni aniqlashtirish uchun kerak bo’ladi.</p>
                </div>
              </div>

              <div className="checkout-fields">
                <label>
                  <span>Ismingiz</span>
                  <input
                    required
                    name="fullName"
                    autoComplete="name"
                    value={form.fullName}
                    onChange={(event) => updateForm("fullName", event.target.value)}
                    placeholder="Masalan, Ali Valiyev"
                  />
                </label>
                <label>
                  <span>Telefon raqamingiz</span>
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
                  <span>Yetkazib berish manzili</span>
                  <textarea
                    required
                    name="address"
                    autoComplete="street-address"
                    rows={3}
                    value={form.address}
                    onChange={(event) => updateForm("address", event.target.value)}
                    placeholder="Tuman, ko’cha, uy va mo’ljalni yozing"
                  />
                </label>
                <label>
                  <span>Qulay sana <em>(ixtiyoriy)</em></span>
                  <input
                    name="deliveryDate"
                    type="date"
                    value={form.deliveryDate}
                    onChange={(event) => updateForm("deliveryDate", event.target.value)}
                  />
                </label>
                <label>
                  <span>Izoh <em>(ixtiyoriy)</em></span>
                  <input
                    name="comment"
                    value={form.comment}
                    onChange={(event) => updateForm("comment", event.target.value)}
                    placeholder="Qo’ng’iroq vaqti, tabrik matni…"
                  />
                </label>
              </div>
            </section>

            <section className="checkout-form__panel" aria-labelledby="payment-title">
              <div className="checkout-section-heading">
                <span>02</span>
                <div>
                  <h2 id="payment-title">To’lov usuli</h2>
                  <p>Online to’lov yo’q — to’lovni yetkazib berilganda qilasiz.</p>
                </div>
              </div>
              <div className="checkout-payment-options" role="radiogroup" aria-label="To'lov usuli">
                <label data-selected={form.paymentMethod === "cash_on_delivery"}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash_on_delivery"
                    checked={form.paymentMethod === "cash_on_delivery"}
                    onChange={() => updateForm("paymentMethod", "cash_on_delivery")}
                  />
                  <span aria-hidden="true">₸</span>
                  <strong>Yetkazib berilganda naqd</strong>
                  <small>Kuryerga naqd pul bilan to’laysiz.</small>
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
                  <strong>Yetkazib berilganda karta</strong>
                  <small>Kuryer terminali orqali karta bilan to’laysiz.</small>
                </label>
              </div>
            </section>

            <section className="checkout-submit-panel">
              <p>
                Buyurtmani tasdiqlash orqali operatorning qo’ng’irog’iga rozilik bildirasiz.
              </p>
              {error ? <p className="checkout-error" role="alert">{error}</p> : null}
              <button
                type="submit"
                className="primary-button checkout-submit-button"
                disabled={isSubmitting || isDemoCatalog}
              >
                {isSubmitting ? "Yuborilmoqda…" : "Buyurtmani tasdiqlash"}
              </button>
            </section>
          </form>
        )}

        {items.length > 0 ? (
          <aside className="checkout-summary" aria-labelledby="summary-title">
            <div className="checkout-summary__heading">
              <p className="eyebrow">Sizning tanlovingiz</p>
              <h2 id="summary-title">Buyurtma tarkibi</h2>
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
                    <p>{formatSum(product.price)} / dona</p>
                    <div className="checkout-line-actions">
                      <div className="quantity-control quantity-control--compact" aria-label={`${product.name} miqdori`}>
                        <button
                          type="button"
                          aria-label={`${product.name} miqdorini kamaytirish`}
                          onClick={() => updateQuantity(product.id, line.quantity - 1)}
                        >
                          <span aria-hidden="true">−</span>
                        </button>
                        <span>{line.quantity}</span>
                        <button
                          type="button"
                          aria-label={`${product.name} miqdorini oshirish`}
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
                        Olib tashlash
                      </button>
                    </div>
                  </div>
                  <strong>{formatSum(product.price * line.quantity)}</strong>
                </article>
              ))}
            </div>
            <dl className="checkout-total">
              <div>
                <dt>Mahsulotlar</dt>
                <dd>{formatSum(subtotal)}</dd>
              </div>
              <div className="checkout-total__grand">
                <dt>Yakuniy jami</dt>
                <dd>Operator tasdiqlaydi</dd>
              </div>
            </dl>
            <p className="checkout-summary__note">
              Yetkazib berish narxi va yakuniy jami buyurtma yuborilganda server tomonidan
              hisoblanadi.
            </p>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
