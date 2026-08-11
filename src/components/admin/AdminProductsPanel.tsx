"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AdminCategory,
  AdminProduct,
  ProductStatus,
  ProductTranslation,
  Season,
} from "@/lib/contracts";
import { SEASONS } from "@/lib/contracts";
import { LOCALES, type Locale } from "@/i18n/config";
import { formatSum } from "@/shared/format";
import { AdminLocaleTabs, ADMIN_LOCALE_LABELS } from "./AdminLocaleTabs";
import { ImageUploader } from "./ImageUploader";

type AdminProductsPanelProps = {
  initialProducts: readonly AdminProduct[];
  categories: readonly AdminCategory[];
};

type ProductTranslationDraft = Record<keyof ProductTranslation, string>;

type ProductDraft = {
  slug: string;
  translations: Record<Locale, ProductTranslationDraft>;
  categoryId: string;
  price: string;
  originalPrice: string;
  stockQuantity: string;
  sortOrder: string;
  imageUrl: string;
  imageAlt: string;
  imagePublicId: string;
  additionalImages: AdminProduct["images"];
  flowerTypes: string;
  colors: string;
  seasons: Season[];
  status: ProductStatus;
  isFeatured: boolean;
  isNew: boolean;
  isOnSale: boolean;
};

type ApiResponse = { product?: AdminProduct; error?: string };

function emptyTranslationDraft(): ProductTranslationDraft {
  return {
    name: "",
    shortDescription: "",
    description: "",
    composition: "",
    deliveryEstimate: "",
    size: "",
    seoTitle: "",
    seoDescription: "",
  };
}

function emptyTranslations(): Record<Locale, ProductTranslationDraft> {
  return {
    ru: emptyTranslationDraft(),
    uz: emptyTranslationDraft(),
    en: emptyTranslationDraft(),
  };
}

function emptyDraft(categoryId: string): ProductDraft {
  return {
    slug: "",
    translations: emptyTranslations(),
    categoryId,
    price: "",
    originalPrice: "",
    stockQuantity: "0",
    sortOrder: "0",
    imageUrl: "",
    imageAlt: "",
    imagePublicId: "",
    additionalImages: [],
    flowerTypes: "",
    colors: "",
    seasons: ["all_year"],
    status: "draft",
    isFeatured: false,
    isNew: false,
    isOnSale: false,
  };
}

function translationToDraft(value: ProductTranslation): ProductTranslationDraft {
  return {
    name: value.name,
    shortDescription: value.shortDescription,
    description: value.description,
    composition: value.composition.join(", "),
    deliveryEstimate: value.deliveryEstimate ?? "",
    size: value.size ?? "",
    seoTitle: value.seoTitle ?? "",
    seoDescription: value.seoDescription ?? "",
  };
}

function productToDraft(product: AdminProduct): ProductDraft {
  return {
    slug: product.slug,
    translations: {
      ru: translationToDraft(product.translations.ru),
      uz: translationToDraft(product.translations.uz),
      en: translationToDraft(product.translations.en),
    },
    categoryId: product.categoryId,
    price: product.price === undefined ? "" : String(product.price),
    originalPrice: product.originalPrice === undefined ? "" : String(product.originalPrice),
    stockQuantity: String(product.stockQuantity),
    sortOrder: String(product.sortOrder),
    imageUrl: product.images[0]?.url ?? "",
    imageAlt: product.images[0]?.alt ?? product.translations.ru.name,
    imagePublicId: product.images[0]?.publicId ?? "",
    additionalImages: product.images.slice(1),
    flowerTypes: product.flowerTypes.join(", "),
    colors: product.colors.join(", "),
    seasons: [...product.seasons],
    status: product.status,
    isFeatured: product.isFeatured,
    isNew: product.isNew,
    isOnSale: product.isOnSale,
  };
}

function commaList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function integer(value: string, label: string): number {
  if (!/^\d+$/.test(value)) throw new Error(`${label} butun son bo‘lishi kerak.`);
  return Number(value);
}

function buildTranslations(draft: ProductDraft): AdminProduct["translations"] {
  return Object.fromEntries(
    LOCALES.map((locale) => {
      const value = draft.translations[locale];
      const label = ADMIN_LOCALE_LABELS[locale];
      const composition = commaList(value.composition);

      if (!value.name.trim()) throw new Error(`${label}: mahsulot nomini kiriting.`);
      if (!value.shortDescription.trim()) {
        throw new Error(`${label}: qisqa tavsifni kiriting.`);
      }
      if (!value.description.trim()) {
        throw new Error(`${label}: batafsil tavsifni kiriting.`);
      }
      if (composition.length === 0) {
        throw new Error(`${label}: kompozitsiyani kiriting.`);
      }

      return [
        locale,
        {
          name: value.name.trim(),
          shortDescription: value.shortDescription.trim(),
          description: value.description.trim(),
          composition,
          ...(value.deliveryEstimate.trim()
            ? { deliveryEstimate: value.deliveryEstimate.trim() }
            : {}),
          ...(value.size.trim() ? { size: value.size.trim() } : {}),
          ...(value.seoTitle.trim() ? { seoTitle: value.seoTitle.trim() } : {}),
          ...(value.seoDescription.trim()
            ? { seoDescription: value.seoDescription.trim() }
            : {}),
        },
      ];
    })
  ) as AdminProduct["translations"];
}

async function readResponse(response: Response): Promise<ApiResponse> {
  try {
    return (await response.json()) as ApiResponse;
  } catch {
    return {};
  }
}

export function AdminProductsPanel({
  initialProducts,
  categories,
}: AdminProductsPanelProps) {
  const router = useRouter();
  const firstCategoryId = categories[0]?.id ?? "";
  const [products, setProducts] = useState<AdminProduct[]>(() => [...initialProducts]);
  const [draft, setDraft] = useState<ProductDraft>(() => emptyDraft(firstCategoryId));
  const [activeLocale, setActiveLocale] = useState<Locale>("ru");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isListEditing, setIsListEditing] = useState(false);
  const [inlineDrafts, setInlineDrafts] = useState<Record<string, ProductDraft>>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const editorRef = useRef<HTMLElement>(null);
  const categoryNames = useMemo(
    () =>
      new Map(
        categories.map((category) => [
          category.id,
          category.translations.uz.name,
        ])
      ),
    [categories]
  );

  const update = <Key extends keyof ProductDraft>(key: Key, value: ProductDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateTranslation = (
    key: keyof ProductTranslationDraft,
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

  const closeForm = () => {
    setDraft(emptyDraft(firstCategoryId));
    setActiveLocale("ru");
    setEditingId(null);
    setError(null);
    setIsFormOpen(false);
  };

  useEffect(() => {
    if (!isFormOpen) return;
    editorRef.current?.focus({ preventScroll: true });
    editorRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [editingId, isFormOpen]);

  const startFullEditing = (product: AdminProduct) => {
    setDraft(productToDraft(product));
    setActiveLocale("ru");
    setEditingId(product.id);
    setIsListEditing(false);
    setInlineDrafts({});
    setError(null);
    setNotice(null);
    setIsFormOpen(true);
  };

  const startListEditing = () => {
    setInlineDrafts(
      Object.fromEntries(products.map((product) => [product.id, productToDraft(product)]))
    );
    setIsListEditing(true);
    setError(null);
    setNotice(null);
  };

  const updateInline = <Key extends keyof ProductDraft>(
    productId: string,
    key: Key,
    value: ProductDraft[Key]
  ) => {
    setInlineDrafts((current) => ({
      ...current,
      [productId]: { ...current[productId]!, [key]: value },
    }));
  };

  const toggleInlineSeason = (
    productId: string,
    season: Season,
    checked: boolean
  ) => {
    const current = inlineDrafts[productId]?.seasons ?? ["all_year"];
    let seasons: Season[];
    if (checked && season === "all_year") seasons = ["all_year"];
    else if (checked) seasons = [...current.filter((item) => item !== "all_year"), season];
    else {
      seasons = current.filter((item) => item !== season);
      if (seasons.length === 0) seasons = ["all_year"];
    }
    updateInline(productId, "seasons", seasons);
  };

  const buildInlinePatch = (product: AdminProduct, row: ProductDraft) => {
    const price = row.price.trim() === "" ? null : integer(row.price, "Narx");
    const stockQuantity = integer(row.stockQuantity, "Qoldiq");
    const patch: Record<string, unknown> = {};
    if (row.translations.ru.name.trim() !== product.translations.ru.name) {
      patch.translations = { ru: { name: row.translations.ru.name.trim() } };
    }
    if (row.categoryId !== product.categoryId) patch.categoryId = row.categoryId;
    if (price !== (product.price ?? null)) patch.price = price;
    if (stockQuantity !== product.stockQuantity) patch.stockQuantity = stockQuantity;
    if (row.status !== product.status) patch.status = row.status;
    if (row.seasons.join("|") !== product.seasons.join("|")) patch.seasons = row.seasons;
    return patch;
  };

  const saveChangedProducts = async () => {
    if (isSaving) return;
    setError(null);
    setNotice(null);
    try {
      const changes = products.flatMap((product) => {
        const row = inlineDrafts[product.id];
        if (!row) return [];
        const patch = buildInlinePatch(product, row);
        return Object.keys(patch).length === 0 ? [] : [{ product, patch }];
      });
      if (changes.length === 0) {
        setIsListEditing(false);
        setInlineDrafts({});
        return;
      }
      setIsSaving(true);
      const saved = await Promise.all(
        changes.map(async ({ product, patch }) => {
          const response = await fetch(`/api/admin/products/${product.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(patch),
          });
          const result = await readResponse(response);
          if (!response.ok || !result.product) {
            throw new Error(result.error ?? `${product.slug} saqlanmadi.`);
          }
          return result.product;
        })
      );
      const savedById = new Map(saved.map((product) => [product.id, product]));
      setProducts((current) => current.map((product) => savedById.get(product.id) ?? product));
      setNotice(`${saved.length} ta o'zgargan mahsulot saqlandi.`);
      setIsListEditing(false);
      setInlineDrafts({});
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Mahsulotlar saqlanmadi.");
    } finally {
      setIsSaving(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving || categories.length === 0) return;

    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const price = draft.price.trim() === "" ? undefined : integer(draft.price, "Narx");
      const stockQuantity = integer(draft.stockQuantity, "Qoldiq");
      const sortOrder = integer(draft.sortOrder, "Tartib");
      const originalPrice = draft.originalPrice
        ? integer(draft.originalPrice, "Eski narx")
        : undefined;
      const flowerTypes = commaList(draft.flowerTypes);
      const colors = commaList(draft.colors);
      const translations = buildTranslations(draft);

      if (!draft.imageUrl || !draft.imageAlt || !flowerTypes.length || !colors.length) {
        throw new Error("Rasm, gul turi va ranglarni to‘ldiring.");
      }
      if (draft.isOnSale && originalPrice === undefined) {
        throw new Error("Aksiya mahsuloti uchun eski narxni kiriting.");
      }

      const payload = {
        slug: draft.slug,
        translations,
        categoryId: draft.categoryId,
        ...(price === undefined ? {} : { price }),
        ...(originalPrice === undefined ? {} : { originalPrice }),
        currency: "UZS" as const,
        images: [
          {
            url: draft.imageUrl,
            alt: draft.imageAlt,
            ...(draft.imagePublicId ? { publicId: draft.imagePublicId } : {}),
          },
          ...draft.additionalImages,
        ],
        flowerTypes,
        colors,
        seasons: draft.seasons,
        stockQuantity,
        sortOrder,
        isFeatured: draft.isFeatured,
        isNew: draft.isNew,
        isOnSale: draft.isOnSale,
        status: draft.status,
      };
      const endpoint = editingId
        ? `/api/admin/products/${editingId}`
        : "/api/admin/products";
      const response = await fetch(endpoint, {
        method: editingId ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await readResponse(response);
      if (!response.ok || !result.product) {
        throw new Error(result.error ?? "Mahsulot saqlanmadi.");
      }

      setProducts((current) =>
        editingId
          ? current.map((product) =>
              product.id === result.product?.id ? result.product : product
            )
          : [result.product!, ...current]
      );
      setNotice(editingId ? "Mahsulot yangilandi." : "Yangi mahsulot saqlandi.");
      closeForm();
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Mahsulot saqlanmadi.");
    } finally {
      setIsSaving(false);
    }
  };

  const archive = async (product: AdminProduct) => {
    const name = product.translations.uz.name;
    if (!window.confirm(`“${name}” mahsulotini arxivga o‘tkazasizmi?`)) return;

    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const result = await readResponse(response);
        throw new Error(result.error ?? "Mahsulot arxivlanmadi.");
      }
      setProducts((current) =>
        current.map((candidate) =>
          candidate.id === product.id
            ? { ...candidate, status: "archived", stockQuantity: 0 }
            : candidate
        )
      );
      setNotice("Mahsulot arxivga o‘tkazildi.");
      router.refresh();
    } catch (archiveError) {
      setError(
        archiveError instanceof Error ? archiveError.message : "Mahsulot arxivlanmadi."
      );
    }
  };

  const activeTranslation = draft.translations[activeLocale];

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <p className="eyebrow">Katalog boshqaruvi</p>
          <h1>Mahsulotlar</h1>
          <p>Har bir mahsulot kontenti uch tilda to‘liq saqlanadi.</p>
        </div>
        <button
          className="admin-primary-button"
          type="button"
          disabled={categories.length === 0}
          onClick={() => {
            setDraft(emptyDraft(firstCategoryId));
            setActiveLocale("ru");
            setEditingId(null);
            setError(null);
            setNotice(null);
            setIsFormOpen(true);
          }}
        >
          + Mahsulot qo‘shish
        </button>
      </section>

      {categories.length === 0 ? (
        <p className="admin-form-error" role="alert">
          Avval kamida bitta kategoriya yarating.
        </p>
      ) : null}
      {notice ? <p className="admin-form-notice" role="status">{notice}</p> : null}
      {error && !isFormOpen ? <p className="admin-form-error" role="alert">{error}</p> : null}

      {isFormOpen ? (
        <section
          ref={editorRef}
          className="admin-card admin-editor"
          aria-labelledby="product-editor-title"
          tabIndex={-1}
        >
          <div className="admin-card__header">
            <div>
              <p className="eyebrow">{editingId ? "Tahrirlash" : "Yangi yozuv"}</p>
              <h2 id="product-editor-title">
                {editingId ? "Mahsulotni yangilash" : "Mahsulot qo‘shish"}
              </h2>
            </div>
            <button className="admin-text-button" type="button" onClick={closeForm}>
              Yopish ×
            </button>
          </div>
          <form className="admin-form-grid" onSubmit={submit}>
            <label>
              <span>Slug</span>
              <input required value={draft.slug} onChange={(event) => update("slug", event.target.value)} placeholder="scarlet-roses" />
            </label>
            <label>
              <span>Kategoriya</span>
              <select value={draft.categoryId} onChange={(event) => update("categoryId", event.target.value)}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.translations.uz.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Holat</span>
              <select value={draft.status} onChange={(event) => update("status", event.target.value as ProductStatus)}>
                <option value="draft">Qoralama</option>
                <option value="published">E’lon qilingan</option>
                <option value="archived">Arxiv</option>
              </select>
            </label>
            <label>
              <span>Narx, so‘m</span>
              <input inputMode="numeric" value={draft.price} onChange={(event) => update("price", event.target.value)} placeholder="So‘rov bo‘yicha bo‘lsa bo‘sh qoldiring" />
            </label>
            <label>
              <span>Eski narx, so‘m</span>
              <input inputMode="numeric" value={draft.originalPrice} onChange={(event) => update("originalPrice", event.target.value)} />
            </label>
            <label>
              <span>Qoldiq</span>
              <input required inputMode="numeric" value={draft.stockQuantity} onChange={(event) => update("stockQuantity", event.target.value)} />
            </label>
            <label>
              <span>Tartib</span>
              <input required inputMode="numeric" value={draft.sortOrder} onChange={(event) => update("sortOrder", event.target.value)} />
            </label>
            <label className="admin-form-grid__full">
              <span>Rasm URL</span>
              <input required type="url" value={draft.imageUrl} onChange={(event) => {
                update("imageUrl", event.target.value);
                update("imagePublicId", "");
              }} placeholder="https://…" />
            </label>
            <label className="admin-form-grid__full">
              <span>Rasm tavsifi</span>
              <input required value={draft.imageAlt} onChange={(event) => update("imageAlt", event.target.value)} />
            </label>
            <div className="admin-form-grid__full">
              <ImageUploader
                alt={draft.imageAlt}
                disabled={isSaving}
                onUploaded={(image) => {
                  update("imageUrl", image.url);
                  update("imageAlt", image.alt);
                  update("imagePublicId", image.publicId ?? "");
                  setNotice("Rasm yuklandi. Mahsulotni saqlashni unutmang.");
                }}
              />
            </div>
            <label>
              <span>Gul turlari</span>
              <input required value={draft.flowerTypes} onChange={(event) => update("flowerTypes", event.target.value)} placeholder="rose, seasonal" />
            </label>
            <label>
              <span>Ranglar</span>
              <input required value={draft.colors} onChange={(event) => update("colors", event.target.value)} placeholder="red, white" />
            </label>

            <fieldset className="admin-season-fieldset admin-form-grid__full">
              <legend>Mavsumiy mavjudlik</legend>
              {SEASONS.map((season) => (
                <label key={season}>
                  <input
                    type="checkbox"
                    checked={draft.seasons.includes(season)}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      const seasons = checked && season === "all_year"
                        ? ["all_year" as const]
                        : checked
                          ? [...draft.seasons.filter((item) => item !== "all_year"), season]
                          : draft.seasons.filter((item) => item !== season);
                      update("seasons", seasons.length > 0 ? seasons : ["all_year"]);
                    }}
                  />
                  <span>{season}</span>
                </label>
              ))}
            </fieldset>

            <div className="admin-form-grid__full admin-localized-editor">
              <AdminLocaleTabs activeLocale={activeLocale} onChange={setActiveLocale} />
              <p className="admin-locale-hint">
                {ADMIN_LOCALE_LABELS[activeLocale]} kontenti
              </p>
            </div>
            <label className="admin-form-grid__full">
              <span>Mahsulot nomi</span>
              <input required value={activeTranslation.name} onChange={(event) => updateTranslation("name", event.target.value)} />
            </label>
            <label className="admin-form-grid__full">
              <span>Qisqa tavsif</span>
              <input required value={activeTranslation.shortDescription} onChange={(event) => updateTranslation("shortDescription", event.target.value)} />
            </label>
            <label className="admin-form-grid__full">
              <span>Batafsil tavsif</span>
              <textarea required rows={4} value={activeTranslation.description} onChange={(event) => updateTranslation("description", event.target.value)} />
            </label>
            <label className="admin-form-grid__full">
              <span>Kompozitsiya</span>
              <input required value={activeTranslation.composition} onChange={(event) => updateTranslation("composition", event.target.value)} placeholder="25 roses, eucalyptus" />
            </label>
            <label>
              <span>Yetkazib berish</span>
              <input value={activeTranslation.deliveryEstimate} onChange={(event) => updateTranslation("deliveryEstimate", event.target.value)} />
            </label>
            <label>
              <span>O‘lcham</span>
              <input value={activeTranslation.size} onChange={(event) => updateTranslation("size", event.target.value)} />
            </label>
            <label className="admin-form-grid__full">
              <span>SEO sarlavha <em>(ixtiyoriy)</em></span>
              <input maxLength={70} value={activeTranslation.seoTitle} onChange={(event) => updateTranslation("seoTitle", event.target.value)} />
            </label>
            <label className="admin-form-grid__full">
              <span>SEO tavsif <em>(ixtiyoriy)</em></span>
              <textarea maxLength={160} rows={2} value={activeTranslation.seoDescription} onChange={(event) => updateTranslation("seoDescription", event.target.value)} />
            </label>
            <div className="admin-switch-group admin-form-grid__full">
              <label><input type="checkbox" checked={draft.isFeatured} onChange={(event) => update("isFeatured", event.target.checked)} /> <span>Asosiy tanlov</span></label>
              <label><input type="checkbox" checked={draft.isNew} onChange={(event) => update("isNew", event.target.checked)} /> <span>Yangi</span></label>
              <label><input type="checkbox" checked={draft.isOnSale} onChange={(event) => update("isOnSale", event.target.checked)} /> <span>Aksiya</span></label>
            </div>
            {error ? <p className="admin-form-error admin-form-grid__full" role="alert">{error}</p> : null}
            <div className="admin-form-actions admin-form-grid__full">
              <button className="admin-secondary-button" type="button" onClick={closeForm}>Bekor qilish</button>
              <button className="admin-primary-button" type="submit" disabled={isSaving}>
                {isSaving ? "Saqlanmoqda…" : "Saqlash"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="admin-card admin-table-card" aria-labelledby="product-list-title">
        <div className="admin-card__header">
          <div>
            <p className="eyebrow">Jami {products.length} ta</p>
            <h2 id="product-list-title">Katalog ro‘yxati</h2>
          </div>
          <div className="admin-row-actions">
            {isListEditing ? (
              <>
                <button type="button" onClick={saveChangedProducts} disabled={isSaving}>
                  {isSaving ? "Saqlanmoqda..." : "O'zgarganlarni saqlash"}
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setIsListEditing(false);
                    setInlineDrafts({});
                    setError(null);
                  }}
                >
                  Bekor qilish
                </button>
              </>
            ) : (
              <button type="button" onClick={startListEditing} disabled={products.length === 0}>
                Ro‘yxatni tahrirlash
              </button>
            )}
          </div>
        </div>
        {products.length === 0 ? (
          <p className="admin-empty-copy">Hali mahsulot yo‘q.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Mahsulot</th><th>Kategoriya</th><th>Narx</th><th>Qoldiq</th><th>Mavsum</th><th>Holat</th><th aria-label="Harakatlar" /></tr></thead>
              <tbody>
                {products.map((product) => {
                  const row = inlineDrafts[product.id];
                  const rowName = product.translations.ru.name;
                  const primaryImage = product.images[0];
                  return <tr key={product.id}>
                    <td className="admin-product-cell">
                      <div className="admin-product-summary">
                        {primaryImage ? (
                          <span className="admin-product-thumbnail">
                            <Image
                              src={primaryImage.url}
                              alt={primaryImage.alt}
                              fill
                              sizes="64px"
                            />
                          </span>
                        ) : (
                          <span
                            className="admin-product-thumbnail admin-product-thumbnail--empty"
                            aria-hidden="true"
                          >
                            ✦
                          </span>
                        )}
                        <span className="admin-product-summary__copy">
                          {isListEditing && row ? <input aria-label={`Mahsulot nomi: ${rowName}`} value={row.translations.ru.name} onChange={(event) => setInlineDrafts((current) => ({ ...current, [product.id]: { ...row, translations: { ...row.translations, ru: { ...row.translations.ru, name: event.target.value } } } }))} /> : <><strong>{product.translations.uz.name}</strong><small>/{product.slug}</small></>}
                        </span>
                      </div>
                    </td>
                    <td data-label="Kategoriya">{isListEditing && row ? <select aria-label={`Kategoriya: ${rowName}`} value={row.categoryId} onChange={(event) => updateInline(product.id, "categoryId", event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.translations.uz.name}</option>)}</select> : categoryNames.get(product.categoryId) ?? "O‘chirilgan kategoriya"}</td>
                    <td data-label="Narx">
                      {isListEditing && row ? <input aria-label={`Narx: ${rowName}`} inputMode="numeric" value={row.price} onChange={(event) => updateInline(product.id, "price", event.target.value)} /> : product.price === undefined
                        ? "Narx so‘rov bo‘yicha"
                        : formatSum(product.price, "uz")}
                    </td>
                    <td data-label="Qoldiq">{isListEditing && row ? <input aria-label={`Qoldiq: ${rowName}`} inputMode="numeric" value={row.stockQuantity} onChange={(event) => updateInline(product.id, "stockQuantity", event.target.value)} /> : product.stockQuantity}</td>
                    <td data-label="Mavsum">{isListEditing && row ? <fieldset className="admin-season-fieldset admin-season-fieldset--compact"><legend className="sr-only">Mavsum: {rowName}</legend>{SEASONS.map((season) => <label key={season}><input type="checkbox" aria-label={`${season[0]!.toUpperCase()}${season.slice(1)}: ${rowName}`} checked={row.seasons.includes(season)} onChange={(event) => toggleInlineSeason(product.id, season, event.target.checked)} /><span>{season}</span></label>)}</fieldset> : product.seasons.join(", ")}</td>
                    <td data-label="Holat">{isListEditing && row ? <select aria-label={`Holat: ${rowName}`} value={row.status} onChange={(event) => updateInline(product.id, "status", event.target.value as ProductStatus)}><option value="draft">Qoralama</option><option value="published">E’lon qilingan</option><option value="archived">Arxiv</option></select> : <span className="admin-status" data-status={product.status}>{product.status}</span>}</td>
                    <td className="admin-product-actions">
                      <div className="admin-row-actions">
                        {isListEditing ? null : (
                          <>
                            <button
                              type="button"
                              aria-label={`To‘liq tahrirlash: ${product.translations.uz.name}`}
                              onClick={() => startFullEditing(product)}
                            >
                              To‘liq tahrirlash
                            </button>
                            <button type="button" onClick={() => archive(product)} disabled={product.status === "archived"}>Arxiv</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
