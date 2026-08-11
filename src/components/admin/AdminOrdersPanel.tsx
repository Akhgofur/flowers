"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { allowedOrderTransitions, type AdminOrder, type OrderStatus } from "@/lib/contracts";
import { formatSum } from "@/shared/format";

type AdminOrdersPanelProps = { initialOrders: readonly AdminOrder[] };
type ApiResponse = { order?: { status: OrderStatus }; error?: string };

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

export function AdminOrdersPanel({ initialOrders }: AdminOrdersPanelProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>(() => [...initialOrders]);
  const [nextStatuses, setNextStatuses] = useState<Record<string, OrderStatus>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
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

  return (
    <>
      <section className="admin-page-heading"><div><p className="eyebrow">Fulfilment oqimi</p><h1>Buyurtmalar</h1><p>Holat faqat oldinga o‘tadi; bekor qilinganda stok bitta tranzaksiyada qaytariladi.</p></div></section>
      {notice ? <p className="admin-form-notice" role="status">{notice}</p> : null}
      {error ? <p className="admin-form-error" role="alert">{error}</p> : null}
      <section className="admin-card admin-orders-card" aria-labelledby="orders-title">
        <div className="admin-card__header"><div><p className="eyebrow">Oxirgi 100 ta</p><h2 id="orders-title">Buyurtmalar tarixi</h2></div></div>
        {orders.length === 0 ? <p className="admin-empty-copy">Hali buyurtma yo‘q.</p> : <div className="admin-orders-list">{orders.map((order) => {
          const choices = allowedOrderTransitions[order.status];
          const selected = nextStatuses[order.id] ?? "";
          return <article key={order.id} className="admin-order"><header><div><p>{formatDate(order.createdAt)} · {order.number}</p><h3>{order.customer.fullName}</h3><a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a></div><span className="admin-status" data-status={order.status}>{STATUS_LABELS[order.status]}</span></header><div className="admin-order__body"><div><strong>{formatSum(order.total)}</strong><span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} ta mahsulot · {order.paymentMethod === "cash_on_delivery" ? "Naqd" : "Karta"}</span></div><p>{order.customer.address}</p><ul>{order.items.map((item) => <li key={`${order.id}-${item.productId}`}>{item.quantity}× {item.name}</li>)}</ul></div>{choices.length > 0 ? <footer><label><span>Keyingi holat</span><select value={selected} onChange={(event) => setNextStatuses((current) => ({ ...current, [order.id]: event.target.value as OrderStatus }))}><option value="">Tanlang</option>{choices.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label><button className="admin-primary-button" type="button" disabled={!selected || savingId === order.id} onClick={() => saveStatus(order)}>{savingId === order.id ? "Saqlanmoqda…" : "Yangilash"}</button></footer> : <footer><span className="admin-order__terminal">Yakuniy holat</span></footer>}</article>;
        })}</div>}
      </section>
    </>
  );
}
