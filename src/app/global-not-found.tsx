import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/seo";
import "@/app/globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: "Страница не найдена | Floraluxe",
  robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="ru">
      <body>
        <main className="store-not-found" aria-labelledby="global-not-found-title">
          <p className="eyebrow">Floraluxe</p>
          <h1 id="global-not-found-title">Страница не найдена</h1>
          <p>Возможно, адрес изменился или страница больше недоступна.</p>
          <Link className="primary-button" href="/ru">
            На главную
          </Link>
        </main>
      </body>
    </html>
  );
}
