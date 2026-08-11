"use client";

import { useState } from "react";
import { LOCALES, type Locale } from "@/i18n/config";
import type {
  AdminSiteSettings,
  SiteSettingsTranslation,
} from "@/lib/contracts";
import { AdminLocaleTabs, ADMIN_LOCALE_LABELS } from "./AdminLocaleTabs";

type AdminSettingsPanelProps = { initialSettings: AdminSiteSettings };
type ApiResponse = { settings?: AdminSiteSettings; error?: string };

type SettingsTranslationDraft = Record<keyof SiteSettingsTranslation, string>;
type SettingsDraft = {
  siteName: string;
  translations: Record<Locale, SettingsTranslationDraft>;
  phone: string;
  email: string;
  address: string;
  workingHours: string;
  deliveryFee: string;
  instagramUrl: string;
  telegramUrl: string;
  seoOgImageUrl: string;
  seoOgImageAlt: string;
};

function translationToDraft(
  translation: SiteSettingsTranslation
): SettingsTranslationDraft {
  return {
    siteDescription: translation.siteDescription,
    deliveryPolicy: translation.deliveryPolicy ?? "",
    seoTitle: translation.seoTitle ?? "",
    seoDescription: translation.seoDescription ?? "",
  };
}

function toDraft(settings: AdminSiteSettings): SettingsDraft {
  return {
    siteName: settings.siteName,
    translations: {
      ru: translationToDraft(settings.translations.ru),
      uz: translationToDraft(settings.translations.uz),
      en: translationToDraft(settings.translations.en),
    },
    phone: settings.phone ?? "",
    email: settings.email ?? "",
    address: settings.address ?? "",
    workingHours: settings.workingHours ?? "",
    deliveryFee: String(settings.deliveryFee),
    instagramUrl: settings.instagramUrl ?? "",
    telegramUrl: settings.telegramUrl ?? "",
    seoOgImageUrl: settings.seoOgImage?.url ?? "",
    seoOgImageAlt: settings.seoOgImage?.alt ?? "",
  };
}

function buildTranslations(
  draft: SettingsDraft
): AdminSiteSettings["translations"] {
  return Object.fromEntries(
    LOCALES.map((locale) => {
      const value = draft.translations[locale];
      const localeLabel = ADMIN_LOCALE_LABELS[locale];
      if (!value.siteDescription.trim()) {
        throw new Error(`${localeLabel}: sayt tavsifini kiriting.`);
      }

      return [
        locale,
        {
          siteDescription: value.siteDescription.trim(),
          ...(value.deliveryPolicy.trim()
            ? { deliveryPolicy: value.deliveryPolicy.trim() }
            : {}),
          ...(value.seoTitle.trim() ? { seoTitle: value.seoTitle.trim() } : {}),
          ...(value.seoDescription.trim()
            ? { seoDescription: value.seoDescription.trim() }
            : {}),
        },
      ];
    })
  ) as AdminSiteSettings["translations"];
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
  const [activeLocale, setActiveLocale] = useState<Locale>("ru");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const update = <Key extends keyof SettingsDraft>(
    key: Key,
    value: SettingsDraft[Key]
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const updateTranslation = (
    key: keyof SettingsTranslationDraft,
    value: string
  ) => {
    setDraft((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [activeLocale]: {
          ...current.translations[activeLocale],
          [key]: value,
        },
      },
    }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (!/^\d+$/.test(draft.deliveryFee)) {
        throw new Error(
          "Yetkazib berish narxi manfiy bo‘lmagan butun son bo‘lishi kerak."
        );
      }
      if (
        (draft.seoOgImageUrl || draft.seoOgImageAlt) &&
        (!draft.seoOgImageUrl || !draft.seoOgImageAlt)
      ) {
        throw new Error(
          "SEO Open Graph rasmi uchun URL va tavsifni birga kiriting."
        );
      }

      const payload = {
        siteName: draft.siteName,
        translations: buildTranslations(draft),
        ...(draft.phone ? { phone: draft.phone } : {}),
        ...(draft.email ? { email: draft.email } : {}),
        ...(draft.address ? { address: draft.address } : {}),
        ...(draft.workingHours ? { workingHours: draft.workingHours } : {}),
        deliveryFee: Number(draft.deliveryFee),
        ...(draft.instagramUrl ? { instagramUrl: draft.instagramUrl } : {}),
        ...(draft.telegramUrl ? { telegramUrl: draft.telegramUrl } : {}),
        ...(draft.seoOgImageUrl && draft.seoOgImageAlt
          ? {
              seoOgImage: {
                url: draft.seoOgImageUrl,
                alt: draft.seoOgImageAlt,
              },
            }
          : {}),
      };
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await readResponse(response);
      if (!response.ok || !result.settings) {
        throw new Error(result.error ?? "Sozlamalar saqlanmadi.");
      }

      setDraft(toDraft(result.settings));
      setNotice(
        "Sozlamalar saqlandi. Yangi matnlar uchala tilda ham ishlaydi."
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Sozlamalar saqlanmadi."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const activeTranslation = draft.translations[activeLocale];

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <p className="eyebrow">Operatsion sozlamalar</p>
          <h1>Do‘kon sozlamalari</h1>
          <p>
            Umumiy aloqa ma’lumotlari bir marta, kontent va SEO esa uch tilda
            boshqariladi.
          </p>
        </div>
      </section>
      {notice ? (
        <p className="admin-form-notice" role="status">
          {notice}
        </p>
      ) : null}
      <section
        className="admin-card admin-editor"
        aria-labelledby="settings-title"
      >
        <div className="admin-card__header">
          <div>
            <p className="eyebrow">Singleton sozlama</p>
            <h2 id="settings-title">Asosiy ma’lumotlar</h2>
          </div>
        </div>
        <form className="admin-form-grid" onSubmit={submit}>
          <label>
            <span>Do‘kon nomi</span>
            <input
              required
              value={draft.siteName}
              onChange={(event) => update("siteName", event.target.value)}
            />
          </label>
          <label>
            <span>Yetkazib berish narxi, so‘m</span>
            <input
              required
              inputMode="numeric"
              value={draft.deliveryFee}
              onChange={(event) => update("deliveryFee", event.target.value)}
            />
          </label>
          <label>
            <span>Telefon</span>
            <input
              value={draft.phone}
              onChange={(event) => update("phone", event.target.value)}
              placeholder="+998 90 123 45 67"
            />
          </label>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={draft.email}
              onChange={(event) => update("email", event.target.value)}
            />
          </label>
          <label className="admin-form-grid__full">
            <span>Manzil</span>
            <input
              value={draft.address}
              onChange={(event) => update("address", event.target.value)}
            />
          </label>
          <label>
            <span>Ish vaqti</span>
            <input
              value={draft.workingHours}
              onChange={(event) => update("workingHours", event.target.value)}
              placeholder="08:00–22:00"
            />
          </label>
          <label>
            <span>Instagram URL</span>
            <input
              type="url"
              value={draft.instagramUrl}
              onChange={(event) => update("instagramUrl", event.target.value)}
              placeholder="https://instagram.com/…"
            />
          </label>
          <label>
            <span>Telegram URL</span>
            <input
              type="url"
              value={draft.telegramUrl}
              onChange={(event) => update("telegramUrl", event.target.value)}
              placeholder="https://t.me/…"
            />
          </label>

          <div className="admin-form-grid__full admin-localized-editor">
            <AdminLocaleTabs
              activeLocale={activeLocale}
              onChange={setActiveLocale}
            />
            <p className="admin-locale-hint">
              {ADMIN_LOCALE_LABELS[activeLocale]} kontenti
            </p>
          </div>
          <label className="admin-form-grid__full">
            <span>Sayt tavsifi</span>
            <textarea
              required
              rows={3}
              value={activeTranslation.siteDescription}
              onChange={(event) =>
                updateTranslation("siteDescription", event.target.value)
              }
            />
          </label>
          <label className="admin-form-grid__full">
            <span>Yetkazib berish siyosati</span>
            <textarea
              rows={3}
              value={activeTranslation.deliveryPolicy}
              onChange={(event) =>
                updateTranslation("deliveryPolicy", event.target.value)
              }
            />
          </label>
          <label className="admin-form-grid__full">
            <span>SEO sarlavha <em>(ixtiyoriy, 70 belgigacha)</em></span>
            <input
              maxLength={70}
              value={activeTranslation.seoTitle}
              onChange={(event) =>
                updateTranslation("seoTitle", event.target.value)
              }
            />
          </label>
          <label className="admin-form-grid__full">
            <span>SEO tavsif <em>(ixtiyoriy, 160 belgigacha)</em></span>
            <textarea
              maxLength={160}
              rows={2}
              value={activeTranslation.seoDescription}
              onChange={(event) =>
                updateTranslation("seoDescription", event.target.value)
              }
            />
          </label>
          <label className="admin-form-grid__full">
            <span>Open Graph rasm URL <em>(ixtiyoriy)</em></span>
            <input
              type="url"
              value={draft.seoOgImageUrl}
              onChange={(event) => update("seoOgImageUrl", event.target.value)}
              placeholder="https://…"
            />
          </label>
          <label className="admin-form-grid__full">
            <span>Open Graph rasm tavsifi</span>
            <input
              value={draft.seoOgImageAlt}
              onChange={(event) => update("seoOgImageAlt", event.target.value)}
            />
          </label>
          {error ? (
            <p className="admin-form-error admin-form-grid__full" role="alert">
              {error}
            </p>
          ) : null}
          <div className="admin-form-actions admin-form-grid__full">
            <button
              className="admin-primary-button"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? "Saqlanmoqda…" : "Sozlamalarni saqlash"}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
