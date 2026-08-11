import { AdminProductsPanel } from "@/components/admin/AdminProductsPanel";
import { getAdminCategories, getAdminProducts } from "@/lib/services/admin-service";

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([getAdminProducts(), getAdminCategories()]);
  return <AdminProductsPanel initialProducts={products} categories={categories} />;
}
