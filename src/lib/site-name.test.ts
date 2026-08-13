import { describe, expect, it } from "vitest";
import { CURRENT_SITE_NAME, resolveSiteName } from "./site-name";

/**
 * A settings document written before the rebrand kept feeding the retired name
 * into the title template and `og:site_name`, so shared links still previewed
 * under the old shop name long after the interface had been renamed.
 */
describe("resolveSiteName", () => {
  it("replaces a retired stored name with the current one", () => {
    expect(resolveSiteName("Nafis Flowers")).toBe(CURRENT_SITE_NAME);
    expect(resolveSiteName("Nafis")).toBe(CURRENT_SITE_NAME);
  });

  it("recognises a retired name whatever its casing or padding", () => {
    expect(resolveSiteName("  nafis flowers  ")).toBe(CURRENT_SITE_NAME);
    expect(resolveSiteName("NAFIS FLOWERS")).toBe(CURRENT_SITE_NAME);
  });

  it("falls back to the current name when nothing is stored", () => {
    expect(resolveSiteName(undefined)).toBe(CURRENT_SITE_NAME);
    expect(resolveSiteName(null)).toBe(CURRENT_SITE_NAME);
    expect(resolveSiteName("   ")).toBe(CURRENT_SITE_NAME);
  });

  it("keeps a name the owner chose, including one that merely mentions flowers", () => {
    expect(resolveSiteName("Floraluxe")).toBe("Floraluxe");
    expect(resolveSiteName("Floraluxe Flowers")).toBe("Floraluxe Flowers");
    expect(resolveSiteName("  Gullar Boutique  ")).toBe("Gullar Boutique");
  });
});
