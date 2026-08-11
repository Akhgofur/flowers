import { AdminSettingsPanel } from "@/components/admin/AdminSettingsPanel";
import { getAdminSettings } from "@/lib/services/admin-service";

export default async function AdminSettingsPage() {
  return <AdminSettingsPanel initialSettings={await getAdminSettings()} />;
}
