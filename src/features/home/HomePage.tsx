"use client";

import { useLocale, useTranslations } from "next-intl";
import { HERO_SLIDES } from "@/data/catalog";
import type { Locale } from "@/i18n/config";
import type {
  CatalogCategory,
  CategoryProductCounts,
  PublicSiteSettings,
} from "@/lib/contracts";
import type { HomePageCatalogData } from "@/lib/services/home-merchandising-service";
import { CategoryStrip } from "@/features/layout/CategoryStrip";
import { HeroCarousel } from "@/features/layout/HeroCarousel";
import { PromoBanner } from "@/features/layout/PromoBanner";
import type { HeroSlide } from "@/shared/types";
import { toClientCategory } from "@/components/storefront/storefront-mappers";
import { ProductRail } from "./ProductRail";

export type HomePageProps = {
  categories: readonly CatalogCategory[];
  merchandising: HomePageCatalogData;
  settings?: PublicSiteSettings;
  /**
   * Whole-catalog totals per category slug. The rails below only carry the
   * merchandised subset, so counting them would under-report every category.
   */
  categoryProductCounts?: CategoryProductCounts;
};

export function HomePage({
  categories,
  merchandising,
  settings,
  categoryProductCounts = {},
}: HomePageProps) {
  const locale = useLocale() as Locale;
  const tHero = useTranslations("Hero");
  const tHome = useTranslations("Home");
  const clientCategories = categories.map((category) =>
    toClientCategory(category, categoryProductCounts)
  );
  const bestSellers = merchandising.bestSellers.length
    ? merchandising.bestSellers
    : merchandising.recommended.slice(0, 8);

  const slides: HeroSlide[] = [
    {
      ...HERO_SLIDES[0]!,
      eyebrow: tHero("slides.summer.eyebrow"),
      title: tHero("slides.summer.title"),
      description: tHero("slides.summer.description"),
      ctaLabel: tHero("slides.summer.cta"),
    },
    {
      ...HERO_SLIDES[1]!,
      eyebrow: tHero("slides.sale.eyebrow"),
      title: tHero("slides.sale.title"),
      description: tHero("slides.sale.description"),
      ctaLabel: tHero("slides.sale.cta"),
    },
    {
      ...HERO_SLIDES[2]!,
      eyebrow: tHero("slides.gift.eyebrow"),
      title: tHero("slides.gift.title"),
      description: tHero("slides.gift.description"),
      ctaLabel: tHero("slides.gift.cta"),
    },
  ];

  const navigateHero = (target: HeroSlide["ctaTarget"]) => {
    const path = target === "#sale"
      ? `/${locale}/catalog?sale=true`
      : target === "#gift"
        ? `/${locale}/catalog?category=boxed`
        : `/${locale}/catalog`;
    window.location.assign(path);
  };

  const contactHref = settings?.telegramUrl ?? (
    settings?.phone ? `tel:${settings.phone.replace(/[^+\d]/g, "")}` : `/${locale}/catalog`
  );

  return (
    <main className="floraluxe-home">
      <HeroCarousel slides={slides} onNavigate={navigateHero} />
      <CategoryStrip
        categories={clientCategories}
        selectedCategory={null}
        hrefForCategory={(category) => `/catalog?category=${encodeURIComponent(category)}`}
      />
      <PromoBanner href="/catalog?category=boxed" />

      {merchandising.dynamicSections.map((section) => (
        <ProductRail
          key={section.id}
          title={section.title}
          description={section.description}
          products={section.products}
        />
      ))}

      <ProductRail
        title={tHome("bestSellers")}
        description={tHome("bestSellersDescription")}
        products={bestSellers}
      />
      <ProductRail
        title={tHome("recommended")}
        description={tHome("recommendedDescription")}
        products={merchandising.recommended}
      />

      <section className="home-contact-cta" aria-labelledby="home-contact-title">
        <div className="shell home-contact-cta__inner">
          <p className="eyebrow">{tHome("contactKicker")}</p>
          <h2 id="home-contact-title">{tHome("contactTitle")}</h2>
          <p>{tHome("contactDescription")}</p>
          <a className="primary-button" href={contactHref}>{tHome("contactCta")}</a>
        </div>
      </section>
    </main>
  );
}
