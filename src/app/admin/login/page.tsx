import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { isAdminAuthConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return <AdminLoginForm authConfigured={isAdminAuthConfigured()} />;
}
