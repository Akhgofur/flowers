import { describe, expect, it } from "vitest";
import { formatSum } from "./format";

describe("formatSum", () => {
  it("formats UZS deterministically for every storefront locale", () => {
    expect(formatSum(535_000, "ru")).toBe("535 000 сум");
    expect(formatSum(535_000, "uz")).toBe("535 000 so‘m");
    expect(formatSum(535_000, "en")).toBe("535,000 UZS");
    expect(formatSum(-1_000, "ru")).toBe("-1 000 сум");
  });
});
