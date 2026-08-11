import type { Locale } from "@/i18n/config";

const GROUPING_SEPARATORS: Record<Locale, string> = {
  ru: "\u00a0",
  uz: "\u00a0",
  en: ",",
};

const CURRENCY_LABELS: Record<Locale, string> = {
  ru: "сум",
  uz: "so‘m",
  en: "UZS",
};

export function formatSum(value: number, locale: Locale): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  const grouped = String(Math.abs(rounded)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    GROUPING_SEPARATORS[locale]
  );

  return `${sign}${grouped} ${CURRENCY_LABELS[locale]}`;
}
