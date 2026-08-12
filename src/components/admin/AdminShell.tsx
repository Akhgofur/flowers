import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { AdminSignOutButton } from "./AdminSignOutButton";

type AdminShellProps = {
  email: string;
  children: ReactNode;
};

const NAVIGATION = [
  { href: "/admin", label: "Umumiy ko‘rinish", symbol: "◌" },
  { href: "/admin/products", label: "Mahsulotlar", symbol: "✦" },
  { href: "/admin/home-sections", label: "Bosh sahifa", symbol: "▤" },
  { href: "/admin/categories", label: "Kategoriyalar", symbol: "⌘" },
  { href: "/admin/orders", label: "Buyurtmalar", symbol: "↗" },
  { href: "/admin/settings", label: "Sozlamalar", symbol: "◐" },
] as const;

export function AdminShell({ email, children }: AdminShellProps) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-wordmark" aria-label="Floraluxe admin paneli">
          <Image src="/brand/floraluxe-mark.png" alt="" width={42} height={42} aria-hidden="true" />
          <strong>Floraluxe</strong>
          <small>ADMIN STUDIO</small>
        </Link>

        <nav className="admin-navigation" aria-label="Administrator navigatsiyasi">
          {NAVIGATION.map((item) => (
            <Link key={item.href} href={item.href}>
              <span aria-hidden="true">{item.symbol}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <p>
            <span>Administrator</span>
            <strong>{email}</strong>
          </p>
          <Link href="/" className="admin-store-link">Do‘konga o‘tish ↗</Link>
          <AdminSignOutButton />
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-topbar">
          <p>FLORALUXE / BOSHQARUV</p>
          <span>Har bir o‘zgarish katalogga avtomatik tatbiq etiladi</span>
        </header>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
