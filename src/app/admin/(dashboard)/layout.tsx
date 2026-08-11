import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAuthOptions } from "@/lib/auth";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

function sameEmail(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export default async function AdminDashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await getServerSession(getAuthOptions());
  const email = session?.user?.email;

  if (!email || !sameEmail(email, env.ADMIN_EMAIL)) {
    redirect("/admin/login");
  }

  return <AdminShell email={email}>{children}</AdminShell>;
}
