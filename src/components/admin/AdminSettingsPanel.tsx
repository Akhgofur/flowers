"use client";

import { useState } from "react";
import type { AdminSiteSettings } from "@/lib/contracts";

type AdminSettingsPanelProps = { initialSettings: AdminSiteSettings };
type ApiResponse = { settings?: AdminSiteSettings; error?: string };

type SettingsDraft = {
  siteName: string;
  siteDescription: string;
  phone: string;
  email: string;
  address: string;
  workingHours: string;
  deliveryFee: string;
  deliveryPolicy: string;
  instagramUrl: string;
  telegramUrl: string;
  seoTitle: string;
  seoDescription: string;
  seoOgImageUrl: string;
  seoOgImageAlt: string;
};

function toDraft(settings: AdminSiteSettings): SettingsDraft {
  return {
    siteName: settings.siteName,
    siteDescription: settings.siteDescription,
    phone: settings.phone ?? "",
    email: settings.email ?? "",
    address: settings.address ?? "",
    workingHours: settings.workingHours ?? "",
    deliveryFee: String(settings.deliveryFee),
    deliveryPolicy: settings.deliveryPolicy ?? "",
    instagramUrl: settings.instagramUrl ?? "",
    telegramUrl: settings.telegramUrl ?? "",
    seoTitle: settings.seoTitle ?? "",
    seoDescription: settings.seoDescription ?? "",
    seoOgImageUrl: settings.seoOgImage?.url ?? "",
    seoOgImageAlt: settings.seoOgImage?.alt ?? "",
  };
}

async function readResponse(response: Response): Promise<ApiResponse> {
  try {
    return (await response.json()) as ApiResponse;
  } catch {
    return {};
  }
}

export function AdminSettingsPanel({ initialSettings }: AdminSettingsPanelProps) {
  const [draft, setDraft] = useState<SettingsDraft>(() => toDraft(initialSettings));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const update = <Key extends keyof SettingsDraft>(key: Key, value: SettingsDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (!/^\d+$/.test(draft.deliveryFee)) {
        throw new Error("Yetkazib berish narxi manfiy bo‘lmagan butun son bo‘lishi kerak.");
      }
      if ((draft.seoOgImageUrl || draft.seoOgImageAlt) && (!draft.seoOgImageUrl || !draft.seoOgImageAlt)) {
        throw new Error("SEO Open Graph rasmi uchun URL va tavsifni birga kiriting.");
      }
      const payload = {
        siteName: draft.siteName,
        siteDescription: draft.siteDescription,
        ...(draft.phone ? { phone: draft.phone } : {}),
        ...(draft.email ? { email: draft.email } : {}),
        ...(draft.address ? { address: draft.address } : {}),
        ...(draft.workingHours ? { workingHours: draft.workingHours } : {}),
        deliveryFee: Number(draft.deliveryFee),
        ...(draft.deliveryPolicy ? { deliveryPolicy: draft.deliveryPolicy } : {}),
        ...(draft.instagramUrl ? { instagramUrl: draft.instagramUrl } : {}),
        ...(draft.telegramUrl ? { telegramUrl: draft.telegramUrl } : {}),
        ...(draft.seoTitle ? { seoTitle: draft.seoTitle } : {}),
        ...(draft.seoDescription ? { seoDescription: draft.seoDescription } : {}),
        ...(draft.seoOgImageUrl && draft.seoOgImageAlt
          ? { seoOgImage: { url: draft.seoOgImageUrl, alt: draft.seoOgImageAlt } }
          : {}),
      };
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await readResponse(response);
      if (!response.ok || !result.settings) throw new Error(result.error ?? "Sozlamalar saqlanmadi.");

      setDraft(toDraft(result.settings));
      setNotice("Sozlamalar saqlandi. Keyingi buyurtmalarda yangi yetkazib berish narxi ishlatiladi.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Sozlamalar saqlanmadi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <section className="admin-page-heading"><div><p className="eyebrow">Operatsion sozlamalar</p><h1>Do‘kon sozlamalari</h1><p>Bu ma’lumotlar buyurtmaning server tomondagi jami va mijoz bilan aloqasi uchun ishlatiladi.</p></div></section>
      {notice ? <p className="admin-form-notice" role="status">{notice}</p> : null}
      <section className="admin-card admin-editor" aria-labelledby="settings-title">
        <div className="admin-card__header"><div><p className="eyebrow">Singleton sozlama</p><h2 id="settings-title">Asosiy ma’lumotlar</h2></div></div>
        <form className="admin-form-grid" onSubmit={submit}>
          <label><span>Do‘kon nomi</span><input required value={draft.siteName} onChange={(event) => update("siteName", event.target.value)} /></label>
          <label><span>Yetkazib berish narxi, so‘m</span><input required inputMode="numeric" value={draft.deliveryFee} onChange={(event) => update("deliveryFee", event.target.value)} /></label>
          <label className="admin-form-grid__full"><span>Sayt tavsifi</span><textarea required rows={3} value={draft.siteDescription} onChange={(event) => update("siteDescription", event.target.value)} /></label>
          <label><span>Telefon</span><input value={draft.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+998 90 123 45 67" /></label>
          <label><span>Email</span><input type="email" value={draft.email} onChange={(event) => update("email", event.target.value)} /></label>
          <label className="admin-form-grid__full"><span>Manzil</span><input value={draft.address} onChange={(event) => update("address", event.target.value)} /></label>
          <label><span>Ish vaqti</span><input value={draft.workingHours} onChange={(event) => update("workingHours", event.target.value)} placeholder="08:00–22:00" /></label>
          <label className="admin-form-grid__full"><span>Yetkazib berish siyosati</span><textarea rows={3} value={draft.deliveryPolicy} onChange={(event) => update("deliveryPolicy", event.target.value)} /></label>
          <label><span>Instagram URL</span><input type="url" value={draft.instagramUrl} onChange={(event) => update("instagramUrl", event.target.value)} placeholder="https://instagram.com/…" /></label>
          <label><span>Telegram URL</span><input type="url" value={draft.telegramUrl} onChange={(event) => update("telegramUrl", event.target.value)} placeholder="https://t.me/…" /></label>
          <label className="admin-form-grid__full"><span>Default SEO sarlavha <em>(ixtiyoriy, 70 belgigacha)</em></span><input maxLength={70} value={draft.seoTitle} onChange={(event) => update("seoTitle", event.target.value)} /></label>
          <label className="admin-form-grid__full"><span>Default SEO tavsif <em>(ixtiyoriy, 160 belgigacha)</em></span><textarea maxLength={160} rows={2} value={draft.seoDescription} onChange={(event) => update("seoDescription", event.target.value)} /></label>
          <label className="admin-form-grid__full"><span>Open Graph rasm URL <em>(ixtiyoriy)</em></span><input type="url" value={draft.seoOgImageUrl} onChange={(event) => update("seoOgImageUrl", event.target.value)} placeholder="https://…" /></label>
          <label className="admin-form-grid__full"><span>Open Graph rasm tavsifi</span><input value={draft.seoOgImageAlt} onChange={(event) => update("seoOgImageAlt", event.target.value)} /></label>
          {error ? <p className="admin-form-error admin-form-grid__full" role="alert">{error}</p> : null}
          <div className="admin-form-actions admin-form-grid__full"><button className="admin-primary-button" type="submit" disabled={isSaving}>{isSaving ? "Saqlanmoqda…" : "Sozlamalarni saqlash"}</button></div>
        </form>
      </section>
    </>
  );
}
