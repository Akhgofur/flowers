import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "@/app/fonts";
import { getSiteUrl } from "@/lib/seo";
import "@/app/globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: "Floraluxe",
  description: "Авторские букеты и доставка цветов по Ташкенту.",
};

export default function RootRedirectLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ru" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
