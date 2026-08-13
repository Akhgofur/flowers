export const CURRENT_SITE_NAME = "Floraluxe";

/**
 * Names the shop traded under before the rebrand. A settings document still
 * holding one is a leftover row, not the owner's choice, so every read presents
 * the current name instead: the stored value reaches the browser as the page
 * title template and `og:site_name`, which is how the old name kept surfacing in
 * link previews long after the interface itself had been renamed.
 */
export const RETIRED_SITE_NAMES = ["Nafis", "Nafis Flowers"] as const;

const RETIRED_LOOKUP = new Set<string>(
  RETIRED_SITE_NAMES.map((name) => name.toLowerCase())
);

/** Blank and retired stored names resolve to the current one; any other name is the owner's. */
export function resolveSiteName(storedName: string | undefined | null): string {
  const trimmed = storedName?.trim() ?? "";
  if (!trimmed) return CURRENT_SITE_NAME;

  return RETIRED_LOOKUP.has(trimmed.toLowerCase()) ? CURRENT_SITE_NAME : trimmed;
}
