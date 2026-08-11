export type PromoBannerProps = {
  onSelectGiftCategory?: () => void;
  href?: string;
};

export function PromoBanner({ onSelectGiftCategory, href }: PromoBannerProps) {
  const t = useTranslations("Promo");

  return (
    <section id="gift" className="promo section" tabIndex={-1}>
      <div className="shell promo__card">
        <div className="promo__ornament" aria-hidden="true">
          <span>✿</span>
          <span>❀</span>
          <span>✿</span>
        </div>
        <div className="promo__content">
          <p className="eyebrow">{t("kicker")}</p>
          <h2>{t("title")}</h2>
          <p>{t("description")}</p>
          {href ? (
            <Link className="secondary-button" href={href}>
              {t("cta")} <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <button className="secondary-button" type="button" onClick={onSelectGiftCategory}>
              {t("cta")} <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
