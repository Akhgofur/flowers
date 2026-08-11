"use client";

import Link from "next/link";

export default function ProductError({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <main className="store-not-found" role="alert">
      <p className="eyebrow">Vaqtinchalik xatolik</p>
      <h1>Mahsulot ma’lumotini yuklab bo‘lmadi</h1>
      <p>Bir necha soniyadan keyin qayta urinib ko‘ring.</p>
      <div className="route-shell__actions">
        <button className="primary-button" type="button" onClick={reset}>Qayta urinish</button>
        <Link className="secondary-button" href="/gullar">Katalogga qaytish</Link>
      </div>
    </main>
  );
}
