export type PromoBannerProps = {
  onSelectGiftCategory: () => void;
};

export function PromoBanner({ onSelectGiftCategory }: PromoBannerProps) {
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
          <button className="secondary-button" type="button" onClick={onSelectGiftCategory}>
            {t("cta")}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
import { useTranslations } from "next-intl";
