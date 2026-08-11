import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function StoreNotFound() {
  const t = useTranslations("Errors");

  return (
    <main className="store-not-found" aria-labelledby="store-not-found-title">
      <p className="eyebrow">Nafis Flowers</p>
      <h1 id="store-not-found-title">{t("notFoundTitle")}</h1>
      <p>{t("notFoundDescription")}</p>
      <Link className="primary-button" href="/catalog">
        {t("goCatalog")}
      </Link>
    </main>
  );
}
