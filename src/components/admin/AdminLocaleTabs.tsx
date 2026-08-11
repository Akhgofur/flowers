import { LOCALES, type Locale } from "@/i18n/config";

export const ADMIN_LOCALE_LABELS: Record<Locale, string> = {
  ru: "Русский",
  uz: "O‘zbekcha",
  en: "English",
};

type AdminLocaleTabsProps = {
  activeLocale: Locale;
  onChange: (locale: Locale) => void;
};

export function AdminLocaleTabs({ activeLocale, onChange }: AdminLocaleTabsProps) {
  return (
    <div className="admin-locale-tabs" role="group" aria-label="Kontent tili">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          aria-pressed={activeLocale === locale}
          onClick={() => onChange(locale)}
        >
          {ADMIN_LOCALE_LABELS[locale]}
        </button>
      ))}
    </div>
  );
}
