import { describe, expect, it } from "vitest";
import { createOrderNumber } from "./order-number";

describe("createOrderNumber", () => {
  it("creates a readable, date-prefixed number with a random collision-resistant suffix", () => {
    const number = createOrderNumber(
      new Date("2026-08-11T09:30:00.000Z"),
      () => "deafbeef-0000-4000-8000-000000000000"
    );

    expect(number).toBe("FL-20260811-DEAFBEEF00");
  });
});
