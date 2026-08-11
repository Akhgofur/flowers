"use client";

export default function AdminDashboardError({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <section className="admin-card admin-runtime-error" role="alert">
      <p className="eyebrow">Ma’lumotlar xatosi</p>
      <h1>Administrator ma’lumotlari yuklanmadi</h1>
      <p>MongoDB yoki tarmoq vaqtincha javob bermadi. Hech qanday o‘zgarish saqlanmadi.</p>
      <button className="admin-primary-button" type="button" onClick={reset}>Qayta urinish</button>
    </section>
  );
}
