import type { PublicSiteSettings } from "@/lib/contracts";

type FooterProps = { settings?: PublicSiteSettings };

const FALLBACK_SETTINGS: Required<
  Pick<
    PublicSiteSettings,
    "siteName" | "siteDescription" | "phone" | "email" | "address" | "workingHours"
  >
> = {
  siteName: "Nafis Flowers",
  siteDescription: "Shahardagi iliq lahzalarni gul tilida yetkazadigan mahalliy floristlar uyi.",
  phone: "+998 71 200 07 07",
  email: "salom@nafis.uz",
  address: "Yunusobod, Toshkent",
  workingHours: "08:00–22:00",
};

function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}

export function Footer({ settings }: FooterProps) {
  const value = { ...FALLBACK_SETTINGS, ...settings };

  return (
    <footer className="site-footer">
      <div className="shell assurances" aria-label="Nafis xizmat kafolatlari">
        <article>
          <span aria-hidden="true">01</span>
          <h3>Tez yetkazish</h3>
          <p>Toshkent bo‘ylab 90 daqiqadan boshlab.</p>
        </article>
        <article>
          <span aria-hidden="true">02</span>
          <h3>Yangi gullar</h3>
          <p>Har bir buket buyurtma kuni yig‘iladi.</p>
        </article>
        <article>
          <span aria-hidden="true">03</span>
          <h3>Aniq tasdiq</h3>
          <p>Tarkib va yetkazish vaqti florist bilan tasdiqlanadi.</p>
        </article>
        <article>
          <span aria-hidden="true">04</span>
          <h3>Parvarish yordami</h3>
          <p>Har bir buyurtmaga florist tavsiyasi qo‘shiladi.</p>
        </article>
      </div>

      <div className="footer-main">
        <div className="shell footer-grid">
          <section id="about" tabIndex={-1}>
            <p className="footer-wordmark">{value.siteName}</p>
            <h2>Biz haqimizda</h2>
            <p>{value.siteDescription}</p>
          </section>
          <section id="delivery" tabIndex={-1}>
            <h2>Yetkazib berish</h2>
            <p>
              {value.workingHours} oralig‘ida Toshkent shahri bo‘ylab. {value.deliveryPolicy ?? "Yetkazish vaqti buyurtmada aniqlanadi."}
            </p>
          </section>
          <section id="contact" tabIndex={-1}>
            <h2>Aloqa</h2>
            <a href={phoneHref(value.phone)}>{value.phone}</a>
            <a href={`mailto:${value.email}`}>{value.email}</a>
            <p>{value.address}</p>
          </section>
        </div>
        <div className="shell footer-bottom">
          <span>© 2026 {value.siteName}</span>
          <span>Mehr bilan Toshkentda yaratilgan</span>
        </div>
      </div>
    </footer>
  );
}
