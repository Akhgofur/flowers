import "server-only";
import { revalidateTag } from "next/cache";
import { CATALOG_CACHE_TAGS, SITE_SETTINGS_CACHE_TAG } from "@/lib/cache";
import type { OrderStatus } from "@/lib/contracts";
import type {
  CategoryInput,
  ProductInput,
  ProductPatchInput,
  SiteSettingsInput,
} from "@/lib/validations";
import {
  archiveAdminProduct,
  createAdminCategory as createAdminCategoryRepository,
  createAdminProduct as createAdminProductRepository,
  findAdminCategories,
  findAdminOrders,
  findAdminProducts,
  findAdminSettings,
  hideAdminCategory,
  patchAdminProduct,
  updateAdminCategory,
  updateAdminProduct,
  updateAdminSettings,
} from "@/lib/repositories/admin-repository";
import { orderService } from "@/lib/services/order-service";

function invalidatePublicCatalog(): void {
  if (process.env.NODE_ENV === "test") return;

  for (const tag of Object.values(CATALOG_CACHE_TAGS)) {
    revalidateTag(tag, "max");
  }
}

export async function getAdminProducts() {
  return findAdminProducts();
}

export async function createAdminProduct(input: ProductInput) {
  const product = await createAdminProductRepository(input);
  invalidatePublicCatalog();
  return product;
}

export async function editAdminProduct(id: string, input: ProductInput) {
  const product = await updateAdminProduct(id, input);
  invalidatePublicCatalog();
  return product;
}

export async function patchAdminProductFields(id: string, input: ProductPatchInput) {
  const product = await patchAdminProduct(id, input);
  invalidatePublicCatalog();
  return product;
}

export async function removeAdminProduct(id: string) {
  await archiveAdminProduct(id);
  invalidatePublicCatalog();
}

export async function getAdminCategories() {
  return findAdminCategories();
}

export async function createAdminCategory(input: CategoryInput) {
  const category = await createAdminCategoryRepository(input);
  invalidatePublicCatalog();
  return category;
}

export async function editAdminCategory(id: string, input: CategoryInput) {
  const category = await updateAdminCategory(id, input);
  invalidatePublicCatalog();
  return category;
}

export async function removeAdminCategory(id: string) {
  await hideAdminCategory(id);
  invalidatePublicCatalog();
}

export async function getAdminOrders() {
  return findAdminOrders();
}

export async function transitionAdminOrder(id: string, status: OrderStatus) {
  return orderService.transitionOrderStatus(id, status);
}

export async function getAdminSettings() {
  return findAdminSettings();
}

export async function saveAdminSettings(input: SiteSettingsInput) {
  const settings = await updateAdminSettings(input);
  if (process.env.NODE_ENV !== "test") revalidateTag(SITE_SETTINGS_CACHE_TAG, "max");
  return settings;
}
