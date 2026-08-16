"use client";

import dynamic from "next/dynamic";
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
import { getProductAvailability } from "@/lib/product-availability";
import { formatSum } from "@/shared/format";
import {
  formatGeoPoint,
  isValidGeoPoint,
  parseGeoPoint,
  roundGeoPoint,
  type GeoPoint,
} from "@/shared/geo-point";
import { applyImageFallback, IMAGE_FALLBACK_URL } from "@/shared/image-fallback";
import { buildMapLinks } from "@/shared/map-links";
import type { CartLine } from "@/shared/types";
import type { Locale } from "@/i18n/config";

// Leaflet reaches for `window` at import time and is far larger than the rest of
// checkout, so the map is fetched only once a shopper actually opens it.
const LocationMap = dynamic(
  () => import("../map/LocationMap").then((module) => module.LocationMap),
  {
    ssr: false,
    loading: () => <div className="checkout-map checkout-map--loading" />,
  }
);

type CheckoutClientProps = {
  products: readonly CatalogProduct[];
  isDemoCatalog?: boolean;
  /** The catalog outgrew the page budget, so `products` is not the whole catalog. */
  catalogTruncated?: boolean;
  /** Where to collect from; any field may be missing from site settings. */
  shop?: { address?: string; workingHours?: string; location?: GeoPoint };
};

type CheckoutForm = Omit<
  CheckoutInput["customer"],
  "address" | "deliveryDate" | "comment" | "location"
> & {
  // The textarea always needs a plain, controlled string regardless of
  // fulfilment — CheckoutInput's address is optional only because a pickup
  // order omits it from the payload entirely (see toCheckoutPayload).
  address: string;
  deliveryDate: string;
  comment: string;
  location: GeoPoint | null;
  paymentMethod: CheckoutInput["paymentMethod"];
  fulfilment: CheckoutInput["fulfilment"];
};

/** What the picker is doing, so the shopper is never left guessing after a tap. */
type LocationStatus =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "denied" }
  | { kind: "unavailable" }
  | { kind: "unparsed" };

type CheckoutResponse = {
  order?: OrderCreationResult;
  error?: string;
  code?: string;
  /** Set when the server rejected one specific line. */
  productId?: string;
  /** Set alongside a `RATE_LIMITED` code: how long the shopper has to wait. */
  retryAfterSeconds?: number;
};

/**
 * Mirrors the server: a published, in-season product is orderable. Price is not a
 * gate — an unpriced line is ordered and the operator agrees the price by phone.
 */
function isOrderable(product: CatalogProduct | undefined, now: Date): product is CatalogProduct {
  return product !== undefined && getProductAvailability(product, now).available;
}

const EMPTY_FORM: CheckoutForm = {
  fullName: "",
  phone: "",
  address: "",
  deliveryDate: "",
  comment: "",
  location: null,
  paymentMethod: "cash_on_delivery",
  fulfilment: "delivery",
};

function toCheckoutPayload(
  form: CheckoutForm,
  items: readonly CartLine[],
  locale: Locale
): CheckoutInput {
  // The API rejects a pickup order that carries an address or a location, so a
  // collecting shopper's payload must omit both entirely rather than send them empty.
  const collecting = form.fulfilment === "pickup";

  return {
    locale,
    fulfilment: form.fulfilment,
    customer: {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      ...(collecting || !form.address.trim() ? {} : { address: form.address.trim() }),
      ...(collecting || !form.location ? {} : { location: form.location }),
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

export function CheckoutClient({
  products,
  isDemoCatalog = false,
  catalogTruncated = false,
  shop,
}: CheckoutClientProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Checkout");
  const tHeader = useTranslations("Header");
  const tProduct = useTranslations("Product");
  // Only orderable (published, in-season) products may enter the cart state.
  // Keeping an unavailable line would hide it from the summary yet still post it,
  // and the server would reject the whole order for an item the shopper can
  // neither see nor remove.
  //
  // A truncated catalog is the one case where absence proves nothing, so the cart
  // is left alone; submission still sends only the lines that are orderable.
  const now = useMemo(() => new Date(), []);
  const orderableIds = useMemo(
    () =>
      catalogTruncated
        ? undefined
        : new Set(
            products
              .filter((product) => isOrderable(product, now))
              .map((product) => product.id)
          ),
    [catalogTruncated, now, products]
  );
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>({ kind: "idle" });
  const [pastedLocation, setPastedLocation] = useState("");
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<OrderCreationResult | null>(null);
  // Captured at submit time, before the cart is cleared: whether the order that was
  // just placed contained a line with no price, so the confirmation screen can flag
  // that its total is partial rather than presenting it as the final sum.
  const [createdOrderHasUnpricedLine, setCreatedOrderHasUnpricedLine] = useState(false);

  useEffect(() => {
    // Browser-only cart storage must be read after SSR hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLines(readCart(orderableIds));
    setIsHydrated(true);
  }, [orderableIds]);

  useEffect(() => {
    if (isHydrated) writeCart(lines);
  }, [isHydrated, lines]);

  const items = useMemo(
    () =>
      lines.flatMap((line) => {
        const product = productsById.get(line.productId);
        return isOrderable(product, now) ? [{ line, product }] : [];
      }),
    [lines, now, productsById]
  );
  const subtotal = items.reduce(
    (sum, { line, product }) => sum + (product.price ?? 0) * line.quantity,
    0
  );

  const updateForm = <Key extends keyof CheckoutForm>(key: Key, value: CheckoutForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  // Clears the typed address, the chosen pin, the pasted map link text and any
  // stale location status on every switch, so switching back to delivery cannot
  // resurrect a pin — or a "could not parse" message — the shopper believes
  // they removed.
  const selectFulfilment = (fulfilment: CheckoutInput["fulfilment"]) => {
    setForm((current) => ({ ...current, fulfilment, address: "", location: null }));
    setIsMapOpen(false);
    setPastedLocation("");
    setLocationStatus({ kind: "idle" });
  };

  const setLocation = (location: GeoPoint | null) => {
    updateForm("location", location);
    setLocationStatus({ kind: "idle" });
    setPastedLocation("");
    // A point that arrived from geolocation or a pasted link is worth showing on the
    // map: it is the only way the shopper can tell the courier is sent to the right
    // door before confirming, and the pin stays draggable from there.
    if (location) setIsMapOpen(true);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus({ kind: "unavailable" });
      return;
    }

    setLocationStatus({ kind: "locating" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        // A device can report a position it cannot actually fix. Storing that
        // would send the courier somewhere off the map instead of nowhere.
        if (!isValidGeoPoint(point)) {
          setLocationStatus({ kind: "unavailable" });
          return;
        }
        setLocation(roundGeoPoint(point));
      },
      (positionError) => {
        setLocationStatus(
          positionError.code === positionError.PERMISSION_DENIED
            ? { kind: "denied" }
            : { kind: "unavailable" }
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
    );
  };

  // Geolocation is unavailable on most desktops and refusable everywhere, so a
  // pasted map link stays a first-class way to hand over the same pin.
  const applyPastedLocation = () => {
    const parsed = parseGeoPoint(pastedLocation);
    if (!parsed) {
      setLocationStatus({ kind: "unparsed" });
      return;
    }
    setLocation(parsed);
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
        body: JSON.stringify(
          toCheckoutPayload(form, items.map(({ line }) => line), locale)
        ),
      });
      const payload = await readCheckoutResponse(response);

      if (!response.ok || !payload.order) {
        // Name the rejected line rather than removing it: dropping the only line
        // would empty the cart and take the explanation off screen with it. The
        // shopper already has a remove control for the line now that they know it.
        const rejected = payload.productId
          ? productsById.get(payload.productId)
          : undefined;
        const message =
          payload.code === "RATE_LIMITED" && typeof payload.retryAfterSeconds === "number"
            ? t("errorRateLimitWait", {
                minutes: Math.max(1, Math.ceil(payload.retryAfterSeconds / 60)),
              })
            : payload.error ?? t("errorService");
        throw new Error(rejected ? `${message} — «${rejected.name}»` : message);
      }

      setCreatedOrder(payload.order);
      setCreatedOrderHasUnpricedLine(
        items.some(({ product }) => product.price === undefined)
      );
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
          {createdOrderHasUnpricedLine ? (
            <p className="checkout-confirmation__note">{t("totalPending")}</p>
          ) : null}
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
              src="/brand/floraluxe-logo.png"
              alt="Floraluxe"
              width={320}
              height={166}
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
                <div
                  className="checkout-fields__full checkout-payment-options"
                  role="radiogroup"
                  aria-label={t("fulfilmentLabel")}
                >
                  <label data-selected={form.fulfilment === "delivery"}>
                    <input
                      type="radio"
                      name="fulfilment"
                      value="delivery"
                      checked={form.fulfilment === "delivery"}
                      onChange={() => selectFulfilment("delivery")}
                    />
                    <span aria-hidden="true">⇢</span>
                    <strong>{t("fulfilmentDelivery")}</strong>
                    <small>{t("fulfilmentDeliveryHelp")}</small>
                  </label>
                  <label data-selected={form.fulfilment === "pickup"}>
                    <input
                      type="radio"
                      name="fulfilment"
                      value="pickup"
                      checked={form.fulfilment === "pickup"}
                      onChange={() => selectFulfilment("pickup")}
                    />
                    <span aria-hidden="true">⌂</span>
                    <strong>{t("fulfilmentPickup")}</strong>
                    <small>{t("fulfilmentPickupHelp")}</small>
                  </label>
                </div>
                {form.fulfilment === "delivery" ? (
                  <>
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
                    <div className="checkout-fields__full checkout-location">
                      <div className="checkout-location__heading">
                        <span>{t("location")} <em>({t("optional")})</em></span>
                        <p>{t("locationHelp")}</p>
                      </div>

                      {/* Both ways in stay available after a point is chosen: the first
                          pin is usually a rough one that the shopper then corrects. */}
                      <div className="checkout-location__actions">
                        <button
                          type="button"
                          className="checkout-location__detect"
                          onClick={detectLocation}
                          disabled={locationStatus.kind === "locating"}
                        >
                          {locationStatus.kind === "locating"
                            ? t("locationDetecting")
                            : t("locationDetect")}
                        </button>
                        <button
                          type="button"
                          aria-expanded={isMapOpen}
                          onClick={() => setIsMapOpen((current) => !current)}
                        >
                          {isMapOpen ? t("locationHideMap") : t("locationPickOnMap")}
                        </button>
                      </div>

                      {isMapOpen ? (
                        <div className="checkout-location__map">
                          <LocationMap
                            value={form.location}
                            onChange={setLocation}
                            label={t("locationMapLabel")}
                          />
                          <p className="checkout-location__hint">{t("locationMapHint")}</p>
                        </div>
                      ) : null}

                      {form.location ? (
                        <div className="checkout-location__picked">
                          <p>
                            <span aria-hidden="true">📍</span>
                            {t("locationPicked", { point: formatGeoPoint(form.location) })}
                          </p>
                          <div className="checkout-location__actions">
                            <a
                              href={buildMapLinks(form.location).yandexMaps}
                              target="_blank"
                              rel="noreferrer noopener"
                            >
                              {t("locationOpenMap")}
                            </a>
                            <button type="button" onClick={() => setLocation(null)}>
                              {t("locationClear")}
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <div className="checkout-location__paste">
                        <label>
                          <span>{t("locationPaste")}</span>
                          <input
                            name="locationLink"
                            inputMode="url"
                            value={pastedLocation}
                            onChange={(event) => {
                              setPastedLocation(event.target.value);
                              if (locationStatus.kind === "unparsed") {
                                setLocationStatus({ kind: "idle" });
                              }
                            }}
                            placeholder={t("locationPastePlaceholder")}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={applyPastedLocation}
                          disabled={pastedLocation.trim().length === 0}
                        >
                          {t("locationApply")}
                        </button>
                      </div>

                      <p className="checkout-location__status" role="status">
                        {locationStatus.kind === "denied"
                          ? t("locationDenied")
                          : locationStatus.kind === "unavailable"
                            ? t("locationUnavailable")
                            : locationStatus.kind === "unparsed"
                              ? t("locationUnparsed")
                              : ""}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="checkout-fields__full checkout-pickup">
                    <strong>{t("fulfilmentPickup")}</strong>
                    {shop?.address ? (
                      <p>
                        <span>{t("pickupPoint")}</span> {shop.address}
                      </p>
                    ) : null}
                    {shop?.workingHours ? (
                      <p>
                        <span>{t("pickupHours")}</span> {shop.workingHours}
                      </p>
                    ) : null}
                    {/* Plain links so the phone hands off to the Yandex app. The
                        taxi link routes from wherever the shopper is to the shop,
                        which is exactly the direction they are travelling. */}
                    {shop?.location ? (
                      <p className="checkout-pickup__links">
                        <a
                          href={buildMapLinks(shop.location).yandexMaps}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t("pickupOpenMap")}
                        </a>
                        <a
                          href={buildMapLinks(shop.location).yandexTaxi}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t("pickupOrderTaxi")}
                        </a>
                      </p>
                    ) : null}
                  </div>
                )}

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
                  <p>{t(form.fulfilment === "pickup" ? "paymentHelpPickup" : "paymentHelp")}</p>
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
                  <strong>{form.fulfilment === "pickup" ? t("cashAtShop") : t("cashOnDelivery")}</strong>
                  <small>{form.fulfilment === "pickup" ? t("cashAtShopHelp") : t("cashHelp")}</small>
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
                  <strong>{form.fulfilment === "pickup" ? t("cardAtShop") : t("cardOnDelivery")}</strong>
                  <small>{form.fulfilment === "pickup" ? t("cardAtShopHelp") : t("cardHelp")}</small>
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
                    <p>
                      {product.price === undefined
                        ? tProduct("priceOnRequest")
                        : `${formatSum(product.price, locale)} / ${t("each")}`}
                    </p>
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
                  <strong>
                    {product.price === undefined
                      ? tProduct("priceOnRequest")
                      : formatSum(product.price * line.quantity, locale)}
                  </strong>
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
