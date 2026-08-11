import { AdminOrdersPanel } from "@/components/admin/AdminOrdersPanel";
import { getAdminOrders } from "@/lib/services/admin-service";

export default async function AdminOrdersPage() {
  return <AdminOrdersPanel initialOrders={await getAdminOrders()} />;
}
