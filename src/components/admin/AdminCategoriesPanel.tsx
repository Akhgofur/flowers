"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AdminCategory,
  CategoryStatus,
  CategoryTranslation,
} from "@/lib/contracts";
import { LOCALES, type Locale } from "@/i18n/config";
import { AdminLocaleTabs, ADMIN_LOCALE_LABELS } from "./AdminLocaleTabs";

type AdminCategoriesPanelProps = { initialCategories: readonly AdminCategory[] };
type CategoryTranslationDraft = Record<keyof CategoryTranslation, string>;
type CategoryDraft = {
  slug: string;
  translations: Record<Locale, CategoryTranslationDraft>;
  imageUrl: string;
  imageAlt: string;
  order: string;
  status: CategoryStatus;
};
type ApiResponse = { category?: AdminCategory; error?: string };

function emptyTranslation(): CategoryTranslationDraft {
  return { name: "", description: "", seoTitle: "", seoDescription: "" };
}

function emptyDraft(): CategoryDraft {
  return {
    slug: "",
    translations: {
      ru: emptyTranslation(),
      uz: emptyTranslation(),
      en: emptyTranslation(),
    },
    imageUrl: "",
    imageAlt: "",
    order: "0",
    status: "published",
  };
}

function translationToDraft(value: CategoryTranslation): CategoryTranslationDraft {
  return {
    name: value.name,
    description: value.description ?? "",
    seoTitle: value.seoTitle ?? "",
    seoDescription: value.seoDescription ?? "",
  };
}

function toDraft(category: AdminCategory): CategoryDraft {
  return {
    slug: category.slug,
    translations: {
      ru: translationToDraft(category.translations.ru),
      uz: translationToDraft(category.translations.uz),
      en: translationToDraft(category.translations.en),
    },
    imageUrl: category.image?.url ?? "",
    imageAlt: category.image?.alt ?? "",
    order: String(category.order),
    status: category.status,
  };
}

function buildTranslations(draft: CategoryDraft): AdminCategory["translations"] {
  return Object.fromEntries(
    LOCALES.map((locale) => {
      const value = draft.translations[locale];
      if (!value.name.trim()) {
        throw new Error(`${ADMIN_LOCALE_LABELS[locale]}: kategoriya nomini kiriting.`);
      }
      return [
        locale,
        {
          name: value.name.trim(),
          ...(value.description.trim() ? { description: value.description.trim() } : {}),
          ...(value.seoTitle.trim() ? { seoTitle: value.seoTitle.trim() } : {}),
          ...(value.seoDescription.trim()
            ? { seoDescription: value.seoDescription.trim() }
            : {}),
        },
      ];
    })
  ) as AdminCategory["translations"];
}

async function readResponse(response: Response): Promise<ApiResponse> {
  try {
    return (await response.json()) as ApiResponse;
  } catch {
    return {};
  }
}

export function AdminCategoriesPanel({
  initialCategories,
}: AdminCategoriesPanelProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<AdminCategory[]>(() => [
    ...initialCategories,
  ]);
  const [draft, setDraft] = useState<CategoryDraft>(emptyDraft);
  const [activeLocale, setActiveLocale] = useState<Locale>("ru");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const update = <Key extends keyof CategoryDraft>(
    key: Key,
    value: CategoryDraft[Key]
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const updateTranslation = (
    key: keyof CategoryTranslationDraft,
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

  const close = () => {
    setDraft(emptyDraft());
    setActiveLocale("ru");
    setEditingId(null);
    setError(null);
    setIsFormOpen(false);
  };

  const edit = (category: AdminCategory) => {
    setDraft(toDraft(category));
    setActiveLocale("ru");
    setEditingId(category.id);
    setError(null);
    setNotice(null);
    setIsFormOpen(true);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      if (!/^\d+$/.test(draft.order)) {
        throw new Error("Tartib manfiy bo‘lmagan butun son bo‘lishi kerak.");
      }
      if ((draft.imageUrl && !draft.imageAlt) || (!draft.imageUrl && draft.imageAlt)) {
        throw new Error("Rasm URL va rasm tavsifini birga kiriting.");
      }

      const payload = {
        slug: draft.slug,
        translations: buildTranslations(draft),
        ...(draft.imageUrl
          ? { image: { url: draft.imageUrl, alt: draft.imageAlt } }
          : {}),
        order: Number(draft.order),
        status: draft.status,
      };
      const endpoint = editingId
        ? `/api/admin/categories/${editingId}`
        : "/api/admin/categories";
      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await readResponse(response);
      if (!response.ok || !result.category) {
        throw new Error(result.error ?? "Kategoriya saqlanmadi.");
      }

      setCategories((current) =>
        editingId
          ? current.map((category) =>
              category.id === result.category?.id ? result.category : category
            )
          : [...current, result.category!].sort((left, right) => left.order - right.order)
      );
      setNotice(editingId ? "Kategoriya yangilandi." : "Kategoriya saqlandi.");
      close();
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Kategoriya saqlanmadi.");
    } finally {
      setIsSaving(false);
    }
  };

  const hide = async (category: AdminCategory) => {
    if (!window.confirm(`“${category.translations.uz.name}” kategoriyasini yashirasizmi?`)) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const result = await readResponse(response);
        throw new Error(result.error ?? "Kategoriya yashirilmadi.");
      }
      setCategories((current) =>
        current.map((candidate) =>
          candidate.id === category.id
            ? { ...candidate, status: "hidden" }
            : candidate
        )
      );
      setNotice("Kategoriya yashirildi.");
      router.refresh();
    } catch (hideError) {
      setError(
        hideError instanceof Error ? hideError.message : "Kategoriya yashirilmadi."
      );
    }
  };

  const activeTranslation = draft.translations[activeLocale];

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <p className="eyebrow">Katalog tuzilmasi</p>
          <h1>Kategoriyalar</h1>
          <p>Kategoriya nomi va SEO kontenti uch tilda boshqariladi.</p>
        </div>
        <button
          className="admin-primary-button"
          type="button"
          onClick={() => {
            setDraft(emptyDraft());
            setActiveLocale("ru");
            setEditingId(null);
            setError(null);
            setNotice(null);
            setIsFormOpen(true);
          }}
        >
          + Kategoriya qo‘shish
        </button>
      </section>

      {notice ? <p className="admin-form-notice" role="status">{notice}</p> : null}
      {error && !isFormOpen ? <p className="admin-form-error" role="alert">{error}</p> : null}

      {isFormOpen ? (
        <section className="admin-card admin-editor" aria-labelledby="category-editor-title">
          <div className="admin-card__header">
            <div>
              <p className="eyebrow">{editingId ? "Tahrirlash" : "Yangi yozuv"}</p>
              <h2 id="category-editor-title">
                {editingId ? "Kategoriyani yangilash" : "Kategoriya qo‘shish"}
              </h2>
            </div>
            <button className="admin-text-button" type="button" onClick={close}>Yopish ×</button>
          </div>
          <form className="admin-form-grid" onSubmit={submit}>
            <label><span>Slug</span><input required value={draft.slug} onChange={(event) => update("slug", event.target.value)} placeholder="roses" /></label>
            <label><span>Tartib</span><input required inputMode="numeric" value={draft.order} onChange={(event) => update("order", event.target.value)} /></label>
            <label><span>Holat</span><select value={draft.status} onChange={(event) => update("status", event.target.value as CategoryStatus)}><option value="published">E’lon qilingan</option><option value="hidden">Yashirilgan</option></select></label>
            <label className="admin-form-grid__full"><span>Rasm URL (ixtiyoriy)</span><input type="url" value={draft.imageUrl} onChange={(event) => update("imageUrl", event.target.value)} /></label>
            <label className="admin-form-grid__full"><span>Rasm tavsifi</span><input value={draft.imageAlt} onChange={(event) => update("imageAlt", event.target.value)} /></label>

            <div className="admin-form-grid__full admin-localized-editor">
              <AdminLocaleTabs activeLocale={activeLocale} onChange={setActiveLocale} />
              <p className="admin-locale-hint">{ADMIN_LOCALE_LABELS[activeLocale]} kontenti</p>
            </div>
            <label className="admin-form-grid__full"><span>Kategoriya nomi</span><input required value={activeTranslation.name} onChange={(event) => updateTranslation("name", event.target.value)} /></label>
            <label className="admin-form-grid__full"><span>Tavsif</span><textarea rows={3} value={activeTranslation.description} onChange={(event) => updateTranslation("description", event.target.value)} /></label>
            <label className="admin-form-grid__full"><span>SEO sarlavha</span><input maxLength={70} value={activeTranslation.seoTitle} onChange={(event) => updateTranslation("seoTitle", event.target.value)} /></label>
            <label className="admin-form-grid__full"><span>SEO tavsif</span><textarea maxLength={160} rows={2} value={activeTranslation.seoDescription} onChange={(event) => updateTranslation("seoDescription", event.target.value)} /></label>
            {error ? <p className="admin-form-error admin-form-grid__full" role="alert">{error}</p> : null}
            <div className="admin-form-actions admin-form-grid__full"><button className="admin-secondary-button" type="button" onClick={close}>Bekor qilish</button><button className="admin-primary-button" type="submit" disabled={isSaving}>{isSaving ? "Saqlanmoqda…" : "Saqlash"}</button></div>
          </form>
        </section>
      ) : null}

      <section className="admin-card admin-table-card" aria-labelledby="category-list-title">
        <div className="admin-card__header"><div><p className="eyebrow">Jami {categories.length} ta</p><h2 id="category-list-title">Kategoriyalar ro‘yxati</h2></div></div>
        {categories.length === 0 ? (
          <p className="admin-empty-copy">Hali kategoriya yo‘q.</p>
        ) : (
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Nomi</th><th>Slug</th><th>Tartib</th><th>Holat</th><th aria-label="Harakatlar" /></tr></thead><tbody>{categories.map((category) => <tr key={category.id}><td><strong>{category.translations.uz.name}</strong><small>{category.translations.uz.description ?? "Tavsif yo‘q"}</small></td><td>/{category.slug}</td><td>{category.order}</td><td><span className="admin-status" data-status={category.status}>{category.status}</span></td><td><div className="admin-row-actions"><button type="button" onClick={() => edit(category)}>Tahrirlash</button><button type="button" onClick={() => hide(category)} disabled={category.status === "hidden"}>Yashirish</button></div></td></tr>)}</tbody></table></div>
        )}
      </section>
    </>
  );
}
