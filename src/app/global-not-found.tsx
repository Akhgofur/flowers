import Link from "next/link";
import "@/app/globals.css";

export default function GlobalNotFound() {
  return (
    <html lang="ru">
      <body>
        <main className="store-not-found" aria-labelledby="global-not-found-title">
          <p className="eyebrow">Nafis Flowers</p>
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
