import { AdminHomeSectionsPanel } from "@/components/admin/AdminHomeSectionsPanel";
import { getAdminProducts } from "@/lib/services/admin-service";
import { getAdminHomeSections } from "@/lib/services/home-section-service";

export default async function AdminHomeSectionsPage() {
  const [sections, products] = await Promise.all([
    getAdminHomeSections(),
    getAdminProducts(),
  ]);
  return <AdminHomeSectionsPanel initialSections={sections} products={products} />;
}
