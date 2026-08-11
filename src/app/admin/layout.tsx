import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "@/app/fonts";
import { getSiteUrl } from "@/lib/seo";
import "@/app/globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: { default: "Floraluxe Admin", template: "%s | Floraluxe Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="uz" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
