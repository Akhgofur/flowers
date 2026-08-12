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

  const summer = new Date("2026-08-12T09:00:00+05:00");

  it("treats a product without a price as orderable", () => {
    expect(
      getProductAvailability({ status: "published", seasons: ["all_year"] }, summer)
    ).toEqual({ available: true, currentSeason: "summer", reason: "available" });
  });

  it("still refuses an out-of-season product", () => {
    expect(
      getProductAvailability({ status: "published", seasons: ["winter"] }, summer).reason
    ).toBe("out_of_season");
  });

  it("still refuses an unpublished product", () => {
    expect(
      getProductAvailability({ status: "draft", seasons: ["all_year"] }, summer).reason
    ).toBe("unpublished");
  });
});
