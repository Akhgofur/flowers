/**
 * How much notice the shop needs before a delivery date.
 *
 * The answer is a Tashkent calendar date, never the server's own. Vercel runs in
 * UTC and the shopper's browser runs in whatever zone their phone says, so
 * computing "tomorrow" from either would give the wrong day for part of every
 * evening. Following `getTashkentSeason`, the zone is pinned explicitly.
 */

/** A florist needs a day to buy the flowers and assemble the order. */
export const DELIVERY_NOTICE_DAYS = 1;

const tashkentParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tashkent",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Assembled from parts rather than a locale's own date order — `en-CA` happens
 * to print YYYY-MM-DD today, but nothing in the spec promises it will.
 */
function tashkentCalendarDate(now: Date): { year: number; month: number; day: number } {
  const parts = tashkentParts.formatToParts(now);
  const read = (type: "year" | "month" | "day") =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: read("year"), month: read("month"), day: read("day") };
}

/** Today in Tashkent, as `YYYY-MM-DD`. */
export function tashkentToday(now: Date): string {
  const { year, month, day } = tashkentCalendarDate(now);
  return isoDate(year, month, day);
}

/**
 * The earliest date an order may be delivered, as `YYYY-MM-DD`. Feeds both the
 * date input's `min` and the server's own check, so the form cannot offer a date
 * the service would refuse.
 */
export function earliestDeliveryDate(now: Date): string {
  const { year, month, day } = tashkentCalendarDate(now);
  // Date.UTC normalises the roll over a month or year end for us.
  return isoDate(year, month, day + DELIVERY_NOTICE_DAYS);
}

function isoDate(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

/** True when a chosen date leaves the shop too little notice. */
export function isDeliveryDateTooSoon(value: string, now: Date): boolean {
  // Both sides are `YYYY-MM-DD`, which compares correctly as plain text.
  return value < earliestDeliveryDate(now);
}
