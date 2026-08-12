"use client";

import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminLoginFormProps = {
  authConfigured?: boolean;
};

export function AdminLoginForm({ authConfigured = true }: AdminLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || !authConfigured) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl: "/admin",
      });

      if (!result || result.error) {
        setError("Email yoki parol noto‘g‘ri.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Kirishni hozir tasdiqlab bo‘lmadi. Qayta urinib ko‘ring.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="admin-login-page">
      <div className="admin-login-card">
        <Link href="/" className="admin-login-card__brand" aria-label="Floraluxe bosh sahifasi">
          <Image src="/brand/floraluxe-mark.png" alt="" width={46} height={46} aria-hidden="true" />
          Floraluxe
        </Link>
        <p className="eyebrow">Yopiq hudud</p>
        <h1>Administrator kirishi</h1>
        <p className="admin-login-card__lead">
          Katalog, buyurtmalar va yetkazib berish sozlamalarini boshqaring.
        </p>
        {!authConfigured ? (
          <p className="admin-form-error" role="alert">
            Administrator kirishi hali serverda sozlanmagan. `.env.local` ichiga
            `NEXTAUTH_SECRET`, `ADMIN_EMAIL` va `ADMIN_PASSWORD_HASH`ni kiriting,
            so‘ng serverni qayta ishga tushiring.
          </p>
        ) : null}
        <form onSubmit={submit}>
          <label>
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              disabled={!authConfigured}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
            />
          </label>
          <label>
            <span>Parol</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              disabled={!authConfigured}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </label>
          {error ? <p className="admin-form-error" role="alert">{error}</p> : null}
          <button className="admin-primary-button" type="submit" disabled={isSubmitting || !authConfigured}>
            {isSubmitting ? "Tekshirilmoqda…" : "Kirish"}
          </button>
        </form>
        <Link href="/" className="admin-login-card__back">← Do‘konga qaytish</Link>
      </div>
    </main>
  );
}
