"use client";

import Link from "next/link";

export default function AppError({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <main className="route-shell route-shell--error">
      <p className="eyebrow">Vaqtinchalik xatolik</p>
      <h1>Sahifani yuklab bo‘lmadi</h1>
      <p>Ma’lumotlar hozir javob bermadi. Qayta urinib ko‘ring yoki bosh sahifaga qayting.</p>
      <div className="route-shell__actions">
        <button className="primary-button" type="button" onClick={reset}>Qayta urinish</button>
        <Link className="secondary-button" href="/">Bosh sahifa</Link>
      </div>
    </main>
  );
}
