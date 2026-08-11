import { AdminCategoriesPanel } from "@/components/admin/AdminCategoriesPanel";
import { getAdminCategories } from "@/lib/services/admin-service";

export default async function AdminCategoriesPage() {
  return <AdminCategoriesPanel initialCategories={await getAdminCategories()} />;
}
