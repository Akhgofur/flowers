"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function StoreError({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  const t = useTranslations("Errors");

  return (
    <main className="route-shell route-shell--error" role="alert">
      <p className="eyebrow">Nafis Flowers</p>
      <h1>{t("unexpected")}</h1>
      <div className="route-shell__actions">
        <button className="primary-button" type="button" onClick={reset}>
          {t("retry")}
        </button>
        <Link className="secondary-button" href="/">
          {t("goHome")}
        </Link>
      </div>
    </main>
  );
}
