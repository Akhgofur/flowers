import type { Locale } from "@/i18n/config";

const NUMBER_LOCALES: Record<Locale, string> = {
  ru: "ru-RU",
  uz: "uz-UZ",
  en: "en-US",
};

const CURRENCY_LABELS: Record<Locale, string> = {
  ru: "сум",
  uz: "so‘m",
  en: "UZS",
};

export function formatSum(value: number, locale: Locale): string {
  return `${new Intl.NumberFormat(NUMBER_LOCALES[locale], {
    maximumFractionDigits: 0,
  }).format(value)} ${CURRENCY_LABELS[locale]}`;
}
