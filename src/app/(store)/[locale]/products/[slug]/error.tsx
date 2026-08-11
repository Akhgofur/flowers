"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function ProductError({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  const t = useTranslations("Errors");

  return (
    <main className="store-not-found" role="alert">
      <p className="eyebrow">{t("temporary")}</p>
      <h1>{t("productLoadTitle")}</h1>
      <p>{t("productLoadDescription")}</p>
      <div className="route-shell__actions">
        <button className="primary-button" type="button" onClick={reset}>{t("retry")}</button>
        <Link className="secondary-button" href="/catalog">{t("goCatalog")}</Link>
      </div>
    </main>
  );
}
