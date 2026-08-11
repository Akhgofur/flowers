import type {
  CategoryTranslation,
  ProductTranslation,
  SiteSettingsTranslation,
} from "@/lib/contracts";
import type { Locale } from "@/i18n/config";

type UnknownLocalizedDocument = {
  translations?: Partial<Record<Locale, unknown>>;
  name?: unknown;
  shortDescription?: unknown;
  description?: unknown;
  composition?: unknown;
  deliveryEstimate?: unknown;
  size?: unknown;
  seoTitle?: unknown;
  seoDescription?: unknown;
};

type UnknownSettingsDocument = {
  translations?: Partial<Record<Locale, unknown>>;
  siteDescription?: unknown;
  deliveryPolicy?: unknown;
  seoTitle?: unknown;
  seoDescription?: unknown;
};

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function optionalString(value: unknown): string | undefined {
  return nonEmptyString(value) ? value : undefined;
}

function readProductTranslation(value: unknown): ProductTranslation | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    !nonEmptyString(record.name) ||
    !nonEmptyString(record.shortDescription) ||
    !nonEmptyString(record.description) ||
    !Array.isArray(record.composition) ||
    record.composition.length === 0 ||
    !record.composition.every(nonEmptyString)
  ) {
    return null;
  }

  return {
    name: record.name,
    shortDescription: record.shortDescription,
    description: record.description,
    composition: [...record.composition],
    ...(optionalString(record.deliveryEstimate)
      ? { deliveryEstimate: record.deliveryEstimate as string }
      : {}),
    ...(optionalString(record.size) ? { size: record.size as string } : {}),
    ...(optionalString(record.seoTitle)
      ? { seoTitle: record.seoTitle as string }
      : {}),
    ...(optionalString(record.seoDescription)
      ? { seoDescription: record.seoDescription as string }
      : {}),
  };
}

function readCategoryTranslation(value: unknown): CategoryTranslation | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!nonEmptyString(record.name)) return null;

  return {
    name: record.name,
    ...(optionalString(record.description)
      ? { description: record.description as string }
      : {}),
    ...(optionalString(record.seoTitle)
      ? { seoTitle: record.seoTitle as string }
      : {}),
    ...(optionalString(record.seoDescription)
      ? { seoDescription: record.seoDescription as string }
      : {}),
  };
}

function readSiteSettingsTranslation(value: unknown): SiteSettingsTranslation | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!nonEmptyString(record.siteDescription)) return null;

  return {
    siteDescription: record.siteDescription,
    ...(optionalString(record.deliveryPolicy)
      ? { deliveryPolicy: record.deliveryPolicy as string }
      : {}),
    ...(optionalString(record.seoTitle)
      ? { seoTitle: record.seoTitle as string }
      : {}),
    ...(optionalString(record.seoDescription)
      ? { seoDescription: record.seoDescription as string }
      : {}),
  };
}

export function resolveProductTranslation(
  document: UnknownLocalizedDocument,
  locale: Locale
): ProductTranslation | null {
  const requested = readProductTranslation(document.translations?.[locale]);
  if (requested) return requested;

  const russian = readProductTranslation(document.translations?.ru);
  if (russian) return russian;

  // Migration-only compatibility for records seeded before localized fields.
  return readProductTranslation(document);
}

export function resolveCategoryTranslation(
  document: UnknownLocalizedDocument,
  locale: Locale
): CategoryTranslation | null {
  const requested = readCategoryTranslation(document.translations?.[locale]);
  if (requested) return requested;

  const russian = readCategoryTranslation(document.translations?.ru);
  if (russian) return russian;

  return readCategoryTranslation(document);
}

export function resolveSiteSettingsTranslation(
  document: UnknownSettingsDocument,
  locale: Locale
): SiteSettingsTranslation | null {
  const requested = readSiteSettingsTranslation(document.translations?.[locale]);
  if (requested) return requested;

  const russian = readSiteSettingsTranslation(document.translations?.ru);
  if (russian) return russian;

  return readSiteSettingsTranslation(document);
}
