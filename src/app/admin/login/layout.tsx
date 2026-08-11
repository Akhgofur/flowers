import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Administrator kirishi",
  robots: { index: false, follow: false },
};

export default function AdminLoginLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
