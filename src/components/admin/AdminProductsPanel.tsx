"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminCategory, AdminProduct, ProductStatus } from "@/lib/contracts";
import { formatSum } from "@/shared/format";
import { ImageUploader } from "./ImageUploader";

type AdminProductsPanelProps = {
  initialProducts: readonly AdminProduct[];
  categories: readonly AdminCategory[];
};

type ProductDraft = {
  name: string;
  slug: string;
  categoryId: string;
  price: string;
  originalPrice: string;
  stockQuantity: string;
  sortOrder: string;
  imageUrl: string;
  imageAlt: string;
  imagePublicId: string;
  shortDescription: string;
  description: string;
  composition: string;
  flowerTypes: string;
  colors: string;
  deliveryEstimate: string;
  size: string;
  seoTitle: string;
  seoDescription: string;
  status: ProductStatus;
  isFeatured: boolean;
  isNew: boolean;
  isOnSale: boolean;
};

type ApiResponse = { product?: AdminProduct; error?: string };

function emptyDraft(categoryId: string): ProductDraft {
  return {
    name: "",
    slug: "",
    categoryId,
    price: "",
    originalPrice: "",
    stockQuantity: "0",
    sortOrder: "0",
    imageUrl: "",
    imageAlt: "",
    imagePublicId: "",
    shortDescription: "",
    description: "",
    composition: "",
    flowerTypes: "",
    colors: "",
    deliveryEstimate: "",
    size: "",
    seoTitle: "",
    seoDescription: "",
    status: "draft",
    isFeatured: false,
    isNew: false,
    isOnSale: false,
  };
}

function productToDraft(product: AdminProduct): ProductDraft {
  return {
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    price: String(product.price),
    originalPrice: product.originalPrice === undefined ? "" : String(product.originalPrice),
    stockQuantity: String(product.stockQuantity),
    sortOrder: String(product.sortOrder),
    imageUrl: product.images[0]?.url ?? "",
    imageAlt: product.images[0]?.alt ?? product.name,
    imagePublicId: product.images[0]?.publicId ?? "",
    shortDescription: product.shortDescription,
    description: product.description,
    composition: product.composition.join(", "),
    flowerTypes: product.flowerTypes.join(", "),
    colors: product.colors.join(", "),
    deliveryEstimate: product.deliveryEstimate ?? "",
    size: product.size ?? "",
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    status: product.status,
    isFeatured: product.isFeatured,
    isNew: product.isNew,
    isOnSale: product.isOnSale,
  };
}

function commaList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function integer(value: string, label: string): number {
  if (!/^\d+$/.test(value)) throw new Error(`${label} butun son bo‘lishi kerak.`);
  return Number(value);
}

async function readResponse(response: Response): Promise<ApiResponse> {
  try {
    return (await response.json()) as ApiResponse;
  } catch {
    return {};
  }
}

export function AdminProductsPanel({ initialProducts, categories }: AdminProductsPanelProps) {
  const router = useRouter();
  const firstCategoryId = categories[0]?.id ?? "";
  const [products, setProducts] = useState<AdminProduct[]>(() => [...initialProducts]);
  const [draft, setDraft] = useState<ProductDraft>(() => emptyDraft(firstCategoryId));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  const update = <Key extends keyof ProductDraft>(key: Key, value: ProductDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const closeForm = () => {
    setDraft(emptyDraft(firstCategoryId));
    setEditingId(null);
    setError(null);
    setIsFormOpen(false);
  };

  const openEdit = (product: AdminProduct) => {
    setDraft(productToDraft(product));
    setEditingId(product.id);
    setError(null);
    setNotice(null);
    setIsFormOpen(true);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving || categories.length === 0) return;

    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const price = integer(draft.price, "Narx");
      const stockQuantity = integer(draft.stockQuantity, "Qoldiq");
      const sortOrder = integer(draft.sortOrder, "Tartib");
      const originalPrice = draft.originalPrice ? integer(draft.originalPrice, "Eski narx") : undefined;
      const composition = commaList(draft.composition);
      const flowerTypes = commaList(draft.flowerTypes);
      const colors = commaList(draft.colors);

      if (!draft.imageUrl || !draft.imageAlt || !composition.length || !flowerTypes.length || !colors.length) {
        throw new Error("Rasm, kompozitsiya, gul turi va ranglarni to‘ldiring.");
      }
      if (draft.isOnSale && originalPrice === undefined) {
        throw new Error("Aksiya mahsuloti uchun eski narxni kiriting.");
      }

      const payload = {
        name: draft.name,
        slug: draft.slug,
        categoryId: draft.categoryId,
        price,
        ...(originalPrice === undefined ? {} : { originalPrice }),
        currency: "UZS" as const,
        images: [
          {
            url: draft.imageUrl,
            alt: draft.imageAlt,
            ...(draft.imagePublicId ? { publicId: draft.imagePublicId } : {}),
          },
        ],
        shortDescription: draft.shortDescription,
        description: draft.description,
        composition,
        flowerTypes,
        colors,
        stockQuantity,
        sortOrder,
        isFeatured: draft.isFeatured,
        isNew: draft.isNew,
        isOnSale: draft.isOnSale,
        status: draft.status,
        ...(draft.deliveryEstimate ? { deliveryEstimate: draft.deliveryEstimate } : {}),
        ...(draft.size ? { size: draft.size } : {}),
        ...(draft.seoTitle ? { seoTitle: draft.seoTitle } : {}),
        ...(draft.seoDescription ? { seoDescription: draft.seoDescription } : {}),
      };
      const endpoint = editingId ? `/api/admin/products/${editingId}` : "/api/admin/products";
      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await readResponse(response);
      if (!response.ok || !result.product) {
        throw new Error(result.error ?? "Mahsulot saqlanmadi.");
      }

      setProducts((current) =>
        editingId
          ? current.map((product) => (product.id === result.product?.id ? result.product : product))
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
    if (!window.confirm(`“${product.name}” mahsulotini arxivga o‘tkazasizmi?`)) return;

    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
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
      setError(archiveError instanceof Error ? archiveError.message : "Mahsulot arxivlanmadi.");
    }
  };

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <p className="eyebrow">Katalog boshqaruvi</p>
          <h1>Mahsulotlar</h1>
          <p>Public katalogda faqat e’lon qilingan va qoldig‘i bor mahsulotlar ko‘rinadi.</p>
        </div>
        <button
          className="admin-primary-button"
          type="button"
          disabled={categories.length === 0}
          onClick={() => {
            setDraft(emptyDraft(firstCategoryId));
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
        <p className="admin-form-error" role="alert">Avval kamida bitta kategoriya yarating.</p>
      ) : null}
      {notice ? <p className="admin-form-notice" role="status">{notice}</p> : null}
      {error && !isFormOpen ? <p className="admin-form-error" role="alert">{error}</p> : null}

      {isFormOpen ? (
        <section className="admin-card admin-editor" aria-labelledby="product-editor-title">
          <div className="admin-card__header">
            <div>
              <p className="eyebrow">{editingId ? "Tahrirlash" : "Yangi yozuv"}</p>
              <h2 id="product-editor-title">{editingId ? "Mahsulotni yangilash" : "Mahsulot qo‘shish"}</h2>
            </div>
            <button className="admin-text-button" type="button" onClick={closeForm}>Yopish ×</button>
          </div>
          <form className="admin-form-grid" onSubmit={submit}>
            <label><span>Nomi</span><input required value={draft.name} onChange={(event) => update("name", event.target.value)} /></label>
            <label><span>Slug</span><input required value={draft.slug} onChange={(event) => update("slug", event.target.value)} placeholder="pushti-lola-buketi" /></label>
            <label><span>Kategoriya</span><select value={draft.categoryId} onChange={(event) => update("categoryId", event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label><span>Holat</span><select value={draft.status} onChange={(event) => update("status", event.target.value as ProductStatus)}><option value="draft">Qoralama</option><option value="published">E’lon qilingan</option><option value="archived">Arxiv</option></select></label>
            <label><span>Narx, so‘m</span><input required inputMode="numeric" value={draft.price} onChange={(event) => update("price", event.target.value)} /></label>
            <label><span>Eski narx, so‘m</span><input inputMode="numeric" value={draft.originalPrice} onChange={(event) => update("originalPrice", event.target.value)} /></label>
            <label><span>Qoldiq</span><input required inputMode="numeric" value={draft.stockQuantity} onChange={(event) => update("stockQuantity", event.target.value)} /></label>
            <label><span>Tartib</span><input required inputMode="numeric" value={draft.sortOrder} onChange={(event) => update("sortOrder", event.target.value)} /></label>
            <label className="admin-form-grid__full"><span>Rasm URL</span><input required type="url" value={draft.imageUrl} onChange={(event) => { update("imageUrl", event.target.value); update("imagePublicId", ""); }} placeholder="https://…" /></label>
            <label className="admin-form-grid__full"><span>Rasm tavsifi</span><input required value={draft.imageAlt} onChange={(event) => update("imageAlt", event.target.value)} placeholder="Rasmda nima ko‘rinishini yozing" /></label>
            <div className="admin-form-grid__full">
              <ImageUploader
                alt={draft.imageAlt}
                disabled={isSaving}
                onUploaded={(image) => {
                  update("imageUrl", image.url);
                  update("imageAlt", image.alt);
                  update("imagePublicId", image.publicId ?? "");
                  setNotice("Rasm Cloudinary'ga yuklandi. Mahsulotni saqlashni unutmang.");
                }}
              />
            </div>
            <label className="admin-form-grid__full"><span>Qisqa tavsif</span><input required value={draft.shortDescription} onChange={(event) => update("shortDescription", event.target.value)} /></label>
            <label className="admin-form-grid__full"><span>Batafsil tavsif</span><textarea required rows={4} value={draft.description} onChange={(event) => update("description", event.target.value)} /></label>
            <label><span>Kompozitsiya</span><input required value={draft.composition} onChange={(event) => update("composition", event.target.value)} placeholder="Atirgul, evkalipt" /></label>
            <label><span>Gul turlari</span><input required value={draft.flowerTypes} onChange={(event) => update("flowerTypes", event.target.value)} placeholder="rose, seasonal" /></label>
            <label><span>Ranglar</span><input required value={draft.colors} onChange={(event) => update("colors", event.target.value)} placeholder="pink, white" /></label>
            <label><span>Yetkazib berish</span><input value={draft.deliveryEstimate} onChange={(event) => update("deliveryEstimate", event.target.value)} placeholder="Bugun 2 soatda" /></label>
            <label><span>O‘lcham</span><input value={draft.size} onChange={(event) => update("size", event.target.value)} placeholder="45 sm" /></label>
            <label className="admin-form-grid__full"><span>SEO sarlavha <em>(ixtiyoriy, 70 belgigacha)</em></span><input maxLength={70} value={draft.seoTitle} onChange={(event) => update("seoTitle", event.target.value)} placeholder="Pushti lola buketi — Toshkentda yetkazib berish" /></label>
            <label className="admin-form-grid__full"><span>SEO tavsif <em>(ixtiyoriy, 160 belgigacha)</em></span><textarea maxLength={160} rows={2} value={draft.seoDescription} onChange={(event) => update("seoDescription", event.target.value)} placeholder="Qidiruv natijasida ko‘rinadigan qisqa tavsif" /></label>
            <div className="admin-switch-group admin-form-grid__full">
              <label><input type="checkbox" checked={draft.isFeatured} onChange={(event) => update("isFeatured", event.target.checked)} /> <span>Asosiy tanlov</span></label>
              <label><input type="checkbox" checked={draft.isNew} onChange={(event) => update("isNew", event.target.checked)} /> <span>Yangi</span></label>
              <label><input type="checkbox" checked={draft.isOnSale} onChange={(event) => update("isOnSale", event.target.checked)} /> <span>Aksiya</span></label>
            </div>
            {error ? <p className="admin-form-error admin-form-grid__full" role="alert">{error}</p> : null}
            <div className="admin-form-actions admin-form-grid__full">
              <button className="admin-secondary-button" type="button" onClick={closeForm}>Bekor qilish</button>
              <button className="admin-primary-button" type="submit" disabled={isSaving}>{isSaving ? "Saqlanmoqda…" : "Saqlash"}</button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="admin-card admin-table-card" aria-labelledby="product-list-title">
        <div className="admin-card__header"><div><p className="eyebrow">Jami {products.length} ta</p><h2 id="product-list-title">Katalog ro‘yxati</h2></div></div>
        {products.length === 0 ? <p className="admin-empty-copy">Hali mahsulot yo‘q.</p> : (
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mahsulot</th><th>Kategoriya</th><th>Narx</th><th>Qoldiq</th><th>Holat</th><th aria-label="Harakatlar" /></tr></thead><tbody>{products.map((product) => (
            <tr key={product.id}><td><strong>{product.name}</strong><small>/{product.slug}</small></td><td>{categoryNames.get(product.categoryId) ?? "O‘chirilgan kategoriya"}</td><td>{formatSum(product.price)}</td><td>{product.stockQuantity}</td><td><span className="admin-status" data-status={product.status}>{product.status}</span></td><td><div className="admin-row-actions"><button type="button" onClick={() => openEdit(product)}>Tahrirlash</button><button type="button" onClick={() => archive(product)} disabled={product.status === "archived"}>Arxiv</button></div></td></tr>
          ))}</tbody></table></div>
        )}
      </section>
    </>
  );
}
