"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { LOCALES, type Locale } from "@/i18n/config";
import { usePathname, useRouter } from "@/i18n/navigation";

const SHORT_LABELS: Record<Locale, string> = {
  ru: "RU",
  uz: "UZ",
  en: "EN",
};

const LONG_LABEL_KEYS = {
  ru: "localeRu",
  uz: "localeUz",
  en: "localeEn",
} as const;

export function LanguageSwitcher() {
  const activeLocale = useLocale() as Locale;
  const t = useTranslations("Header");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const changeLocale = (targetLocale: Locale) => {
    if (targetLocale === activeLocale) return;

    const query = searchParams.toString();
    const hash = typeof window === "undefined" ? "" : window.location.hash;
    const href = `${pathname}${query ? `?${query}` : ""}${hash}`;
    router.replace(href, { locale: targetLocale });
  };

  return (
    <div className="language-switcher" role="group" aria-label={t("language")}>
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          title={t(LONG_LABEL_KEYS[locale])}
          aria-current={activeLocale === locale ? "true" : undefined}
          onClick={() => changeLocale(locale)}
        >
          {SHORT_LABELS[locale]}
        </button>
      ))}
    </div>
  );
}
