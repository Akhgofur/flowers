import type { PublicSiteSettings } from "@/lib/contracts";
import { useTranslations } from "next-intl";

type FooterProps = { settings?: PublicSiteSettings };

const FALLBACK_SETTINGS: Required<
  Pick<
    PublicSiteSettings,
    "siteName" | "phone" | "email" | "address" | "workingHours"
  >
> = {
  siteName: "Nafis Flowers",
  phone: "+998 71 200 07 07",
  email: "salom@nafis.uz",
  address: "Yunusobod, Toshkent",
  workingHours: "08:00–22:00",
};

function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}

export function Footer({ settings }: FooterProps) {
  const t = useTranslations("Footer");
  const value = { ...FALLBACK_SETTINGS, ...settings };
  const description = settings?.siteDescription ?? t("description");
  const deliveryPolicy = settings?.deliveryPolicy ?? t("deliveryFallback");

  return (
    <footer className="site-footer">
      <div className="shell assurances" aria-label={t("assurancesLabel")}>
        <article>
          <span aria-hidden="true">01</span>
          <h3>{t("fastTitle")}</h3>
          <p>{t("fastCopy")}</p>
        </article>
        <article>
          <span aria-hidden="true">02</span>
          <h3>{t("freshTitle")}</h3>
          <p>{t("freshCopy")}</p>
        </article>
        <article>
          <span aria-hidden="true">03</span>
          <h3>{t("confirmTitle")}</h3>
          <p>{t("confirmCopy")}</p>
        </article>
        <article>
          <span aria-hidden="true">04</span>
          <h3>{t("careTitle")}</h3>
          <p>{t("careCopy")}</p>
        </article>
      </div>

      <div className="footer-main">
        <div className="shell footer-grid">
          <section id="about" tabIndex={-1}>
            <p className="footer-wordmark">{value.siteName}</p>
            <h2>{t("aboutTitle")}</h2>
            <p>{description}</p>
          </section>
          <section id="delivery" tabIndex={-1}>
            <h2>{t("deliveryTitle")}</h2>
            <p>{t("deliveryCopy", { hours: value.workingHours, policy: deliveryPolicy })}</p>
          </section>
          <section id="contact" tabIndex={-1}>
            <h2>{t("contactTitle")}</h2>
            <a href={phoneHref(value.phone)}>{value.phone}</a>
            <a href={`mailto:${value.email}`}>{value.email}</a>
            <p>{value.address}</p>
          </section>
        </div>
        <div className="shell footer-bottom">
          <span>{t("copyright", { year: new Date().getFullYear() })}</span>
          <span>{t("createdIn")}</span>
        </div>
      </div>
    </footer>
  );
}
