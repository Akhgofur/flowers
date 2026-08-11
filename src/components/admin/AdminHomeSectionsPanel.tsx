"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type {
  AdminHomeSection,
  AdminProduct,
  HomeSectionStatus,
  HomeSectionTranslation,
} from "@/lib/contracts";
import { AdminLocaleTabs, ADMIN_LOCALE_LABELS } from "./AdminLocaleTabs";

type Props = {
  initialSections: readonly AdminHomeSection[];
  products: readonly AdminProduct[];
};

type TranslationDraft = Record<keyof HomeSectionTranslation, string>;
type SectionDraft = {
  translations: Record<Locale, TranslationDraft>;
  productIds: string[];
  sortOrder: string;
  status: HomeSectionStatus;
  startsAt: string;
  endsAt: string;
};

type ApiResponse = { section?: AdminHomeSection; error?: string };

const emptyTranslation = (): TranslationDraft => ({ title: "", description: "" });

function emptyDraft(): SectionDraft {
  return {
    translations: { ru: emptyTranslation(), uz: emptyTranslation(), en: emptyTranslation() },
    productIds: [],
    sortOrder: "0",
    status: "draft",
    startsAt: "",
    endsAt: "",
  };
}

function toLocalDateTime(value?: string): string {
  return value ? value.slice(0, 16) : "";
}

function sectionToDraft(section: AdminHomeSection): SectionDraft {
  return {
    translations: {
      ru: { title: section.translations.ru.title, description: section.translations.ru.description ?? "" },
      uz: { title: section.translations.uz.title, description: section.translations.uz.description ?? "" },
      en: { title: section.translations.en.title, description: section.translations.en.description ?? "" },
    },
    productIds: [...section.productIds],
    sortOrder: String(section.sortOrder),
    status: section.status,
    startsAt: toLocalDateTime(section.startsAt),
    endsAt: toLocalDateTime(section.endsAt),
  };
}

async function readResponse(response: Response): Promise<ApiResponse> {
  try {
    return (await response.json()) as ApiResponse;
  } catch {
    return {};
  }
}

export function AdminHomeSectionsPanel({ initialSections, products }: Props) {
  const router = useRouter();
  const [sections, setSections] = useState<AdminHomeSection[]>(() => [...initialSections]);
  const [draft, setDraft] = useState<SectionDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeLocale, setActiveLocale] = useState<Locale>("ru");
  const [query, setQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );
  const availableProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((product) => {
      if (draft.productIds.includes(product.id)) return false;
      if (!normalized) return true;
      return Object.values(product.translations).some((translation) =>
        translation.name.toLowerCase().includes(normalized)
      );
    });
  }, [draft.productIds, products, query]);

  const startCreate = () => {
    setDraft(emptyDraft());
    setEditingId(null);
    setActiveLocale("ru");
    setQuery("");
    setError(null);
    setNotice(null);
    setIsEditing(true);
  };

  const startEdit = (section: AdminHomeSection) => {
    setDraft(sectionToDraft(section));
    setEditingId(section.id);
    setActiveLocale("ru");
    setQuery("");
    setError(null);
    setNotice(null);
    setIsEditing(true);
  };

  const updateTranslation = (key: keyof TranslationDraft, value: string) => {
    setDraft((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [activeLocale]: { ...current.translations[activeLocale], [key]: value },
      },
    }));
  };

  const moveProduct = (index: number, direction: -1 | 1) => {
    setDraft((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.productIds.length) return current;
      const productIds = [...current.productIds];
      [productIds[index], productIds[target]] = [productIds[target]!, productIds[index]!];
      return { ...current, productIds };
    });
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setError(null);
    setNotice(null);
    try {
      const translations = Object.fromEntries(
        (Object.keys(draft.translations) as Locale[]).map((locale) => {
          const value = draft.translations[locale];
          if (!value.title.trim()) {
            throw new Error(`${ADMIN_LOCALE_LABELS[locale]} sarlavhasini kiriting.`);
          }
          return [locale, {
            title: value.title.trim(),
            ...(value.description.trim() ? { description: value.description.trim() } : {}),
          }];
        })
      );
      if (draft.productIds.length === 0) throw new Error("Kamida bitta mahsulot tanlang.");
      if (!/^\d+$/.test(draft.sortOrder)) throw new Error("Tartib butun son bo'lishi kerak.");
      const startsAt = draft.startsAt ? new Date(draft.startsAt).toISOString() : undefined;
      const endsAt = draft.endsAt ? new Date(draft.endsAt).toISOString() : undefined;
      if (startsAt && endsAt && startsAt >= endsAt) {
        throw new Error("Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak.");
      }
      const payload = {
        translations,
        productIds: draft.productIds,
        sortOrder: Number(draft.sortOrder),
        status: draft.status,
        ...(startsAt ? { startsAt } : {}),
        ...(endsAt ? { endsAt } : {}),
      };
      setIsSaving(true);
      const response = await fetch(
        editingId ? `/api/admin/home-sections/${editingId}` : "/api/admin/home-sections",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const result = await readResponse(response);
      if (!response.ok || !result.section) {
        throw new Error(result.error ?? "Bo'lim saqlanmadi.");
      }
      setSections((current) => editingId
        ? current.map((section) => section.id === result.section!.id ? result.section! : section)
        : [...current, result.section!].sort((left, right) => left.sortOrder - right.sortOrder));
      setNotice(editingId ? "Bo'lim yangilandi." : "Bo'lim yaratildi.");
      setIsEditing(false);
      setEditingId(null);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Bo'lim saqlanmadi.");
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (section: AdminHomeSection) => {
    if (!window.confirm(`"${section.translations.uz.title}" bo'limini o'chirasizmi?`)) return;
    setError(null);
    const response = await fetch(`/api/admin/home-sections/${section.id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await readResponse(response);
      setError(result.error ?? "Bo'lim o'chirilmadi.");
      return;
    }
    setSections((current) => current.filter((item) => item.id !== section.id));
    setNotice("Bo'lim o'chirildi.");
    router.refresh();
  };

  const activeTranslation = draft.translations[activeLocale];

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <p className="eyebrow">Homepage merchandising</p>
          <h1>Bosh sahifa bo‘limlari</h1>
          <p>Mahsulotlarni tanlang, tartiblang va uch tildagi slider bo‘limlarini boshqaring.</p>
        </div>
        <button className="admin-primary-button" type="button" onClick={startCreate}>
          Bo‘lim yaratish
        </button>
      </section>
      {notice ? <p className="admin-form-notice" role="status">{notice}</p> : null}
      {error && !isEditing ? <p className="admin-form-error" role="alert">{error}</p> : null}

      <div className="admin-merchandising-layout">
        <section className="admin-card" aria-labelledby="home-section-list-title">
          <div className="admin-card__header"><div><p className="eyebrow">{sections.length} ta bo‘lim</p><h2 id="home-section-list-title">Joylashuv tartibi</h2></div></div>
          {sections.length === 0 ? <p className="admin-empty-copy">Hali dinamik bo‘lim yaratilmagan.</p> : <div className="admin-home-section-list">{sections.map((section) => <article key={section.id}><div><strong>{section.translations.uz.title}</strong><span>{section.productIds.length} mahsulot · {section.status}</span></div><div className="admin-row-actions"><button type="button" onClick={() => startEdit(section)}>Tahrirlash</button><button type="button" onClick={() => { setDraft(sectionToDraft(section)); setEditingId(null); setIsEditing(true); }}>Nusxalash</button><button type="button" onClick={() => remove(section)}>O‘chirish</button></div></article>)}</div>}
        </section>

        {isEditing ? <section className="admin-card admin-editor" aria-labelledby="home-section-editor-title">
          <div className="admin-card__header"><div><p className="eyebrow">{editingId ? "Tahrirlash" : "Yangi bo‘lim"}</p><h2 id="home-section-editor-title">Bo‘lim kompozitsiyasi</h2></div><button className="admin-text-button" type="button" onClick={() => setIsEditing(false)}>Yopish ×</button></div>
          <form className="admin-form-grid" onSubmit={save}>
            <div className="admin-form-grid__full admin-localized-editor"><AdminLocaleTabs activeLocale={activeLocale} onChange={setActiveLocale} /><p className="admin-locale-hint">{ADMIN_LOCALE_LABELS[activeLocale]} kontenti</p></div>
            <label className="admin-form-grid__full"><span>Bo‘lim sarlavhasi</span><input required value={activeTranslation.title} onChange={(event) => updateTranslation("title", event.target.value)} /></label>
            <label className="admin-form-grid__full"><span>Qisqa tavsif</span><textarea rows={2} value={activeTranslation.description} onChange={(event) => updateTranslation("description", event.target.value)} /></label>
            <label><span>Bo‘lim holati</span><select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as HomeSectionStatus }))}><option value="draft">Qoralama</option><option value="published">E’lon qilingan</option></select></label>
            <label><span>Tartib</span><input inputMode="numeric" value={draft.sortOrder} onChange={(event) => setDraft((current) => ({ ...current, sortOrder: event.target.value }))} /></label>
            <label><span>Boshlanish vaqti</span><input type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft((current) => ({ ...current, startsAt: event.target.value }))} /></label>
            <label><span>Tugash vaqti</span><input type="datetime-local" value={draft.endsAt} onChange={(event) => setDraft((current) => ({ ...current, endsAt: event.target.value }))} /></label>

            <div className="admin-product-picker admin-form-grid__full">
              <label><span>Mahsulot qidirish</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
              <div className="admin-product-picker__results" aria-label="Mahsulot qidiruv natijalari">{availableProducts.slice(0, 12).map((product) => <button key={product.id} type="button" aria-label={`${product.translations.ru.name}ni qo'shish`} onClick={() => setDraft((current) => ({ ...current, productIds: [...current.productIds, product.id] }))}><span>{product.translations.ru.name}</span><strong>Qo‘shish +</strong></button>)}</div>
            </div>

            <div className="admin-selected-products admin-form-grid__full" aria-label="Tanlangan mahsulotlar">
              {draft.productIds.map((productId, index) => {
                const product = productById.get(productId);
                if (!product) return null;
                return <article key={productId}><span>{String(index + 1).padStart(2, "0")}</span><strong>{product.translations.ru.name}</strong><div className="admin-row-actions"><button type="button" disabled={index === 0} onClick={() => moveProduct(index, -1)}>Yuqoriga</button><button type="button" disabled={index === draft.productIds.length - 1} onClick={() => moveProduct(index, 1)}>Pastga</button><button type="button" onClick={() => setDraft((current) => ({ ...current, productIds: current.productIds.filter((id) => id !== productId) }))}>Olib tashlash</button></div></article>;
              })}
            </div>
            {error ? <p className="admin-form-error admin-form-grid__full" role="alert">{error}</p> : null}
            <div className="admin-form-actions admin-form-grid__full"><button className="admin-secondary-button" type="button" onClick={() => setIsEditing(false)}>Bekor qilish</button><button className="admin-primary-button" type="submit" disabled={isSaving}>{isSaving ? "Saqlanmoqda..." : "Bo'limni saqlash"}</button></div>
          </form>
        </section> : null}
      </div>
    </>
  );
}
