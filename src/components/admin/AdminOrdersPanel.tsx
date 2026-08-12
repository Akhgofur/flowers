"use client";

import { useRef, useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { useFocusTrap } from "@/shared/a11y/useFocusTrap";
import { allowedOrderTransitions, type AdminOrder, type OrderStatus } from "@/lib/contracts";
import { formatSum } from "@/shared/format";

type AdminOrdersPanelProps = { initialOrders: readonly AdminOrder[] };
type ApiResponse = { order?: { status: OrderStatus }; error?: string };
type RetryResponse = { attempted?: number; sent?: number; failed?: number; error?: string };

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Kutilmoqda",
  confirmed: "Tasdiqlangan",
  preparing: "Tayyorlanmoqda",
  delivering: "Yetkazilmoqda",
  delivered: "Yetkazildi",
  cancelled: "Bekor qilingan",
};

function formatDate(value: string): string {
  return value.slice(0, 10).split("-").reverse().join(".");
}

async function readResponse(response: Response): Promise<ApiResponse> {
  try {
    return (await response.json()) as ApiResponse;
  } catch {
    return {};
  }
}

async function readRetryResponse(response: Response): Promise<RetryResponse> {
  try {
    return (await response.json()) as RetryResponse;
  } catch {
    return {};
  }
}

/**
 * Fulfilment must stay truthful: a broken thumbnail is hidden rather than swapped
 * for the storefront's decorative fallback, which would show the florist a bouquet
 * that is not the one ordered.
 */
function hideBrokenThumbnail(event: SyntheticEvent<HTMLImageElement>): void {
  event.currentTarget.style.display = "none";
}

type ZoomedImage = { url: string; name: string; trigger: HTMLElement };

function OrderImageLightbox({
  image,
  onClose,
}: {
  image: ZoomedImage;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useFocusTrap({
    active: true,
    containerRef: dialogRef,
    initialFocusRef: closeRef,
    restoreFocusTarget: image.trigger,
    onEscape: onClose,
  });

  return (
    <div className="admin-lightbox-backdrop" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="admin-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label={image.name}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <strong>{image.name}</strong>
          <button ref={closeRef} type="button" aria-label="Yopish" onClick={onClose}>
            <span aria-hidden="true">×</span>
          </button>
        </header>
        {/* eslint-disable-next-line @next/next/no-img-element -- same snapshot-host reason as the thumbnail. */}
        <img src={image.url} alt={image.name} />
      </div>
    </div>
  );
}

export function AdminOrdersPanel({ initialOrders }: AdminOrdersPanelProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>(() => [...initialOrders]);
  const [nextStatuses, setNextStatuses] = useState<Record<string, OrderStatus>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState<ZoomedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const saveStatus = async (order: AdminOrder) => {
    const status = nextStatuses[order.id];
    if (!status || savingId) return;

    setSavingId(order.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await readResponse(response);
      if (!response.ok || !result.order) throw new Error(result.error ?? "Holat yangilanmadi.");

      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: result.order!.status } : item));
      setNextStatuses((current) => {
        const next = { ...current };
        delete next[order.id];
        return next;
      });
      setNotice(`${order.number} buyurtmasi yangilandi.`);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Holat yangilanmadi.");
    } finally {
      setSavingId(null);
    }
  };

  const retryTelegram = async (order: AdminOrder) => {
    if (retryingId) return;
    setRetryingId(order.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/admin/orders/${order.id}/retry-notification`,
        { method: "POST" }
      );
      const result = await readRetryResponse(response);
      if (!response.ok) throw new Error(result.error ?? "Telegram xabari yuborilmadi.");
      const status = result.sent === 1 ? "sent" : "failed";
      setOrders((current) => current.map((item) =>
        item.id === order.id
          ? {
              ...item,
              telegram: {
                status,
                attempts: (item.telegram?.attempts ?? 0) + (result.attempted ?? 0),
                ...(status === "failed" ? { lastErrorCode: "HTTP_REJECTED" } : {}),
              },
            }
          : item
      ));
      setNotice(status === "sent" ? "Telegram xabari yuborildi." : "Telegram qayta yuborish navbatiga qo'yildi.");
      router.refresh();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Telegram xabari yuborilmadi.");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <>
      <section className="admin-page-heading"><div><p className="eyebrow">Fulfilment oqimi</p><h1>Buyurtmalar</h1><p>Holat faqat oldinga o‘tadi.</p></div></section>
      {notice ? <p className="admin-form-notice" role="status">{notice}</p> : null}
      {error ? <p className="admin-form-error" role="alert">{error}</p> : null}
      <section className="admin-card admin-orders-card" aria-labelledby="orders-title">
        <div className="admin-card__header"><div><p className="eyebrow">Oxirgi 100 ta</p><h2 id="orders-title">Buyurtmalar tarixi</h2></div></div>
        {orders.length === 0 ? <p className="admin-empty-copy">Hali buyurtma yo‘q.</p> : <div className="admin-orders-list">{orders.map((order) => {
          const choices = allowedOrderTransitions[order.status];
          const selected = nextStatuses[order.id] ?? "";
          return <article key={order.id} className="admin-order"><header><div><p>{formatDate(order.createdAt)} · {order.number} · {order.locale.toUpperCase()}</p><h3>{order.customer.fullName}</h3><a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a></div><span className="admin-status" data-status={order.status}>{STATUS_LABELS[order.status]}</span></header><div className="admin-order__body"><div><strong>{formatSum(order.total, "uz")}</strong><span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} ta mahsulot · {order.paymentMethod === "cash_on_delivery" ? "Naqd" : "Karta"}</span></div><p>{order.customer.address}</p><ul className="admin-order__items">{order.items.map((item) => <li key={`${order.id}-${item.productId}`}>
                    {item.imageUrl ? (
                      <button
                        className="admin-order__thumb-button"
                        type="button"
                        aria-label={`${item.name} rasmini kattalashtirish`}
                        onClick={(event) =>
                          setZoomed({
                            url: item.imageUrl,
                            name: item.name,
                            trigger: event.currentTarget,
                          })
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- an order snapshot may point at any host the operator once typed into the product form, and next/image throws on an unconfigured one, which would take the whole fulfilment page down for a 44px thumbnail. */}
                        <img
                          className="admin-order__thumb"
                          src={item.imageUrl}
                          alt=""
                          loading="lazy"
                          onError={hideBrokenThumbnail}
                        />
                      </button>
                    ) : null}
                    <span>{item.quantity}× {item.name}{item.lineTotal === undefined ? " · Narx so‘rov bo‘yicha" : ""}</span>
                  </li>)}</ul>{order.telegram ? <div className="admin-notification-status"><div><span>Telegram</span><strong data-status={order.telegram.status}>{order.telegram.status}</strong><small>{order.telegram.attempts} urinish{order.telegram.lastErrorCode ? <> · <code>{order.telegram.lastErrorCode}</code></> : null}</small></div><button type="button" disabled={!(["failed", "pending"] as const).includes(order.telegram.status as "failed" | "pending") || retryingId === order.id} onClick={() => retryTelegram(order)}>{retryingId === order.id ? "Yuborilmoqda..." : "Telegram xabarini qayta yuborish"}</button></div> : <p className="admin-notification-status">Telegram xabari hali yaratilmagan.</p>}</div>{choices.length > 0 ? <footer><label><span>Keyingi holat</span><select value={selected} onChange={(event) => setNextStatuses((current) => ({ ...current, [order.id]: event.target.value as OrderStatus }))}><option value="">Tanlang</option>{choices.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label><button className="admin-primary-button" type="button" disabled={!selected || savingId === order.id} onClick={() => saveStatus(order)}>{savingId === order.id ? "Saqlanmoqda…" : "Yangilash"}</button></footer> : <footer><span className="admin-order__terminal">Yakuniy holat</span></footer>}</article>;
        })}</div>}
      </section>
      {zoomed ? (
        <OrderImageLightbox image={zoomed} onClose={() => setZoomed(null)} />
      ) : null}
    </>
  );
}
