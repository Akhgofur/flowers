import { randomUUID } from "node:crypto";

type RandomId = () => string;

function formatUtcDate(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error("Cannot create an order number from an invalid date.");
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Human-readable while retaining enough entropy to make a database collision
 * exceptionally unlikely. The unique index on Order.number remains the final
 * authority, and the order service retries a duplicate-key collision.
 */
export function createOrderNumber(date = new Date(), randomId: RandomId = randomUUID): string {
  const suffix = randomId().replaceAll("-", "").slice(0, 10).toUpperCase();
  if (suffix.length !== 10) {
    throw new Error("Order number generator returned too little entropy.");
  }

  return `NF-${formatUtcDate(date)}-${suffix}`;
}
