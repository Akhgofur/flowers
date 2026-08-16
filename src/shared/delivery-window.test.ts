import { describe, expect, it } from "vitest";
import {
  DELIVERY_NOTICE_DAYS,
  earliestDeliveryDate,
  isDeliveryDateTooSoon,
  tashkentToday,
} from "./delivery-window";

describe("delivery window", () => {
  it("asks for one day of notice", () => {
    expect(DELIVERY_NOTICE_DAYS).toBe(1);
  });

  it("reads the date in Tashkent, not in the server's zone", () => {
    // 22:30 UTC on 16 August is already 03:30 on 17 August in Tashkent (+5), so
    // a server thinking in UTC would offer a date the shop has already reached.
    const lateUtcEvening = new Date("2026-08-16T22:30:00.000Z");

    expect(tashkentToday(lateUtcEvening)).toBe("2026-08-17");
    expect(earliestDeliveryDate(lateUtcEvening)).toBe("2026-08-18");
  });

  it("still reads the same day when Tashkent and UTC agree", () => {
    const morning = new Date("2026-08-16T06:00:00.000Z");

    expect(tashkentToday(morning)).toBe("2026-08-16");
    expect(earliestDeliveryDate(morning)).toBe("2026-08-17");
  });

  it("rolls over a month end", () => {
    expect(earliestDeliveryDate(new Date("2026-08-31T06:00:00.000Z"))).toBe("2026-09-01");
  });

  it("rolls over a year end", () => {
    expect(earliestDeliveryDate(new Date("2026-12-31T06:00:00.000Z"))).toBe("2027-01-01");
  });

  it("handles a leap year's end of February", () => {
    expect(earliestDeliveryDate(new Date("2028-02-28T06:00:00.000Z"))).toBe("2028-02-29");
  });

  it("refuses today and anything earlier, accepts tomorrow onward", () => {
    const now = new Date("2026-08-16T06:00:00.000Z");

    expect(isDeliveryDateTooSoon("2026-08-15", now)).toBe(true);
    expect(isDeliveryDateTooSoon("2026-08-16", now)).toBe(true);
    expect(isDeliveryDateTooSoon("2026-08-17", now)).toBe(false);
    expect(isDeliveryDateTooSoon("2026-09-01", now)).toBe(false);
  });
});
