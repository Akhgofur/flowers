import { describe, expect, it } from "vitest";
import {
  getProductAvailability,
  getTashkentSeason,
  isSeasonActive,
} from "./product-availability";

describe("seasonal product availability", () => {
  it.each([
    ["2026-03-01T00:00:00+05:00", "spring"],
    ["2026-06-01T00:00:00+05:00", "summer"],
    ["2026-09-01T00:00:00+05:00", "autumn"],
    ["2026-12-01T00:00:00+05:00", "winter"],
  ] as const)("maps %s to the Tashkent %s season", (timestamp, expected) => {
    expect(getTashkentSeason(new Date(timestamp))).toBe(expected);
  });

  it("uses Tashkent time at a UTC month boundary", () => {
    expect(getTashkentSeason(new Date("2026-02-28T19:30:00.000Z"))).toBe("spring");
  });

  it("treats all-year and the current named season as active", () => {
    const summerDate = new Date("2026-08-11T10:00:00.000Z");

    expect(isSeasonActive(["all_year"], summerDate)).toBe(true);
    expect(isSeasonActive(["summer"], summerDate)).toBe(true);
    expect(isSeasonActive(["winter"], summerDate)).toBe(false);
  });

  it.each([
    [{ status: "draft", seasons: ["all_year"], stockQuantity: 5, price: 100_000 }, "unpublished"],
    [{ status: "published", seasons: ["winter"], stockQuantity: 5, price: 100_000 }, "out_of_season"],
    [{ status: "published", seasons: ["summer"], stockQuantity: 0, price: 100_000 }, "out_of_stock"],
    [{ status: "published", seasons: ["summer"], stockQuantity: 5 }, "price_missing"],
    [{ status: "published", seasons: ["summer"], stockQuantity: 5, price: 100_000 }, "available"],
  ] as const)("returns the highest-priority %s reason", (product, reason) => {
    expect(
      getProductAvailability(product, new Date("2026-08-11T10:00:00.000Z"))
    ).toEqual({
      available: reason === "available",
      currentSeason: "summer",
      reason,
    });
  });
});
