import "server-only";
import type { Types } from "mongoose";
import type {
  AdminCategory,
  AdminOrder,
  AdminProduct,
  AdminSiteSettings,
} from "@/lib/contracts";
import { AdminNotFoundError } from "@/lib/admin-api";
import { resolveSiteSettingsTranslation } from "@/lib/locale-content";
import { dbConnect } from "@/lib/mongodb";
import type { CategoryInput, ProductInput, SiteSettingsInput } from "@/lib/validations";
import { CategoryModel, type CategoryDocument } from "@/models/Category";
import { OrderModel, type OrderDocument } from "@/models/Order";
import { ProductModel, type ProductDocument } from "@/models/Product";
import { SiteSettingsModel, type SiteSettingsDocument } from "@/models/SiteSettings";
import { setAndUnsetOptionalFields } from "./update-fields";

type ProductRecord = ProductDocument & { _id: Types.ObjectId };
type CategoryRecord = CategoryDocument & { _id: Types.ObjectId };
type OrderRecord = OrderDocument & { _id: Types.ObjectId };
type SettingsRecord = SiteSettingsDocument & { _id: Types.ObjectId };

const DEFAULT_SETTINGS: AdminSiteSettings = {
  siteName: "Nafis Flowers",
  translations: {
    ru: { siteDescription: "Авторские букеты и бережная доставка цветов по Ташкенту." },
    uz: { siteDescription: "Toshkent bo‘ylab mualliflik buketlari va ehtiyotkor yetkazib berish." },
    en: { siteDescription: "Signature bouquets and thoughtful flower delivery across Tashkent." },
  },
  deliveryFee: 0,
};

function toAdminProduct(document: ProductRecord): AdminProduct {
  return {
    id: document._id.toString(),
    slug: document.slug,
    translations: {
      ru: { ...document.translations.ru, composition: [...document.translations.ru.composition] },
      uz: { ...document.translations.uz, composition: [...document.translations.uz.composition] },
      en: { ...document.translations.en, composition: [...document.translations.en.composition] },
    },
    categoryId: document.categoryId.toString(),
    price: document.price,
    ...(document.originalPrice === undefined ? {} : { originalPrice: document.originalPrice }),
    currency: "UZS",
    images: document.images.map((image) => ({ ...image })),
    flowerTypes: [...document.flowerTypes],
    colors: [...document.colors],
    stockQuantity: document.stockQuantity,
    sortOrder: document.sortOrder,
    isFeatured: document.isFeatured,
    isNew: document.isNewArrival,
    isOnSale: document.isOnSale,
    status: document.status,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

function toAdminCategory(document: CategoryRecord): AdminCategory {
  return {
    id: document._id.toString(),
    slug: document.slug,
    translations: {
      ru: { ...document.translations.ru },
      uz: { ...document.translations.uz },
      en: { ...document.translations.en },
    },
    ...(document.image === undefined ? {} : { image: { ...document.image } }),
    order: document.order,
    status: document.status,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

function toAdminOrder(document: OrderRecord): AdminOrder {
  return {
    id: document._id.toString(),
    number: document.number,
    locale: document.locale ?? "ru",
    customer: {
      fullName: document.customer.fullName,
      phone: document.customer.phone,
      address: document.customer.address,
      ...(document.customer.deliveryDate === undefined
        ? {}
        : { deliveryDate: document.customer.deliveryDate.toISOString() }),
      ...(document.customer.comment === undefined ? {} : { comment: document.customer.comment }),
    },
    items: document.items.map((item) => ({
      productId: item.productId.toString(),
      slug: item.slug,
      name: item.name,
      imageUrl: item.imageUrl,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    subtotal: document.subtotal,
    deliveryFee: document.deliveryFee,
    total: document.total,
    paymentMethod: document.paymentMethod,
    paymentStatus: "unpaid",
    status: document.status,
    ...(document.stockReleasedAt === undefined
      ? {}
      : { stockReleasedAt: document.stockReleasedAt.toISOString() }),
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

function toAdminSettings(document: SettingsRecord | null): AdminSiteSettings {
  if (!document) return { ...DEFAULT_SETTINGS };

  const translations = {
    ru: resolveSiteSettingsTranslation(document, "ru") ?? DEFAULT_SETTINGS.translations.ru,
    uz: resolveSiteSettingsTranslation(document, "uz") ?? DEFAULT_SETTINGS.translations.uz,
    en: resolveSiteSettingsTranslation(document, "en") ?? DEFAULT_SETTINGS.translations.en,
  };

  return {
    siteName: document.siteName,
    translations,
    ...(document.phone === undefined ? {} : { phone: document.phone }),
    ...(document.email === undefined ? {} : { email: document.email }),
    ...(document.address === undefined ? {} : { address: document.address }),
    ...(document.workingHours === undefined ? {} : { workingHours: document.workingHours }),
    deliveryFee: document.deliveryFee,
    ...(document.instagramUrl === undefined
      ? {}
      : { instagramUrl: document.instagramUrl }),
    ...(document.telegramUrl === undefined
      ? {}
      : { telegramUrl: document.telegramUrl }),
    ...(document.seoOgImage === undefined ? {} : { seoOgImage: { ...document.seoOgImage } }),
    updatedAt: document.updatedAt.toISOString(),
  };
}

function splitProductInput(input: ProductInput) {
  const { isNew, ...rest } = input;
  return { ...rest, isNewArrival: isNew };
}

const PRODUCT_OPTIONAL_FIELDS = [
  "originalPrice",
] as const;
const CATEGORY_OPTIONAL_FIELDS = ["image"] as const;
const SETTINGS_OPTIONAL_FIELDS = [
  "phone",
  "email",
  "address",
  "workingHours",
  "instagramUrl",
  "telegramUrl",
  "seoOgImage",
] as const;

async function ensureCategoryExists(categoryId: string): Promise<void> {
  const exists = await CategoryModel.exists({ _id: categoryId });
  if (!exists) throw new AdminNotFoundError("Mahsulot kategoriyasi topilmadi.");
}

export async function findAdminProducts(): Promise<AdminProduct[]> {
  await dbConnect();
  const documents = (await ProductModel.find({})
    .sort({ updatedAt: -1, _id: -1 })
    .lean()
    .exec()) as unknown as ProductRecord[];

  return documents.map(toAdminProduct);
}

export async function createAdminProduct(input: ProductInput): Promise<AdminProduct> {
  await dbConnect();
  await ensureCategoryExists(input.categoryId);
  const document = (await ProductModel.create(splitProductInput(input))) as unknown as ProductRecord;
  return toAdminProduct(document);
}

export async function updateAdminProduct(
  id: string,
  input: ProductInput
): Promise<AdminProduct> {
  await dbConnect();
  await ensureCategoryExists(input.categoryId);
  const document = (await ProductModel.findByIdAndUpdate(
    id,
    setAndUnsetOptionalFields(splitProductInput(input), PRODUCT_OPTIONAL_FIELDS),
    { new: true, runValidators: true }
  )
    .lean()
    .exec()) as unknown as ProductRecord | null;

  if (!document) throw new AdminNotFoundError("Mahsulot topilmadi.");
  return toAdminProduct(document);
}

export async function archiveAdminProduct(id: string): Promise<void> {
  await dbConnect();
  const result = await ProductModel.updateOne(
    { _id: id },
    { $set: { status: "archived", stockQuantity: 0 } }
  ).exec();

  if (result.matchedCount === 0) throw new AdminNotFoundError("Mahsulot topilmadi.");
}

export async function findAdminCategories(): Promise<AdminCategory[]> {
  await dbConnect();
  const documents = (await CategoryModel.find({})
    .sort({ order: 1, "translations.ru.name": 1, _id: 1 })
    .lean()
    .exec()) as unknown as CategoryRecord[];

  return documents.map(toAdminCategory);
}

export async function createAdminCategory(input: CategoryInput): Promise<AdminCategory> {
  await dbConnect();
  const document = (await CategoryModel.create(input)) as unknown as CategoryRecord;
  return toAdminCategory(document);
}

export async function updateAdminCategory(
  id: string,
  input: CategoryInput
): Promise<AdminCategory> {
  await dbConnect();
  const document = (await CategoryModel.findByIdAndUpdate(
    id,
    setAndUnsetOptionalFields(input, CATEGORY_OPTIONAL_FIELDS),
    { new: true, runValidators: true }
  )
    .lean()
    .exec()) as unknown as CategoryRecord | null;

  if (!document) throw new AdminNotFoundError("Kategoriya topilmadi.");
  return toAdminCategory(document);
}

export async function hideAdminCategory(id: string): Promise<void> {
  await dbConnect();
  const result = await CategoryModel.updateOne(
    { _id: id },
    { $set: { status: "hidden" } }
  ).exec();

  if (result.matchedCount === 0) throw new AdminNotFoundError("Kategoriya topilmadi.");
}

export async function findAdminOrders(limit = 100): Promise<AdminOrder[]> {
  await dbConnect();
  const documents = (await OrderModel.find({})
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .lean()
    .exec()) as unknown as OrderRecord[];

  return documents.map(toAdminOrder);
}

export async function findAdminSettings(): Promise<AdminSiteSettings> {
  await dbConnect();
  const document = (await SiteSettingsModel.findOne({ key: "default" })
    .lean()
    .exec()) as unknown as SettingsRecord | null;

  return toAdminSettings(document);
}

export async function updateAdminSettings(
  input: SiteSettingsInput
): Promise<AdminSiteSettings> {
  await dbConnect();
  const document = (await SiteSettingsModel.findOneAndUpdate(
    { key: "default" },
    { ...setAndUnsetOptionalFields(input, SETTINGS_OPTIONAL_FIELDS), $setOnInsert: { key: "default" } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )
    .lean()
    .exec()) as unknown as SettingsRecord | null;

  if (!document) throw new Error("Settings write did not return a document.");
  return toAdminSettings(document);
}
