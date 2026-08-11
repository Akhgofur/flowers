import { describe, expect, it } from "vitest";
import { formatSum } from "./format";

describe("formatSum", () => {
  it("uses a deterministic Uzbek so'm format across server and browser runtimes", () => {
    expect(formatSum(535_000)).toBe("535 000 so'm");
    expect(formatSum(20_000)).toBe("20 000 so'm");
    expect(formatSum(-1_000)).toBe("-1 000 so'm");
  });
});
