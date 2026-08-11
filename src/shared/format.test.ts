import { afterEach, describe, expect, it, vi } from "vitest";
import { formatSum } from "./format";

describe("formatSum", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("formats UZS deterministically for every storefront locale", () => {
    expect(formatSum(535_000, "ru")).toBe("535 000 сум");
    expect(formatSum(535_000, "uz")).toBe("535 000 so‘m");
    expect(formatSum(535_000, "en")).toBe("535,000 UZS");
    expect(formatSum(-1_000, "ru")).toBe("-1 000 сум");
  });
  it("does not let browser-specific Intl grouping change hydrated text", () => {
    vi.spyOn(Intl, "NumberFormat").mockImplementation(
      () => ({ format: () => "735,000" }) as unknown as Intl.NumberFormat
    );

    expect(formatSum(735_000, "uz")).toBe("735\u00a0000 so\u2018m");
  });
});
