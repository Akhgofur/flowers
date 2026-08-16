import { FULFILMENT_METHODS, type FulfilmentMethod } from "@/lib/contracts";

const KNOWN = new Set<string>(FULFILMENT_METHODS);

/**
 * Presents a stored fulfilment method, defaulting anything unusable to delivery.
 *
 * Orders are read with `.lean()`, which skips schema defaults, so every order
 * written before this field existed arrives with it undefined. Those orders were
 * deliveries — they all carry an address — so that is what they read back as.
 * Mirrors `resolveSiteName` in `@/lib/site-name`, which corrects a stored value
 * on read for the same reason: to avoid rewriting the collection.
 */
export function resolveFulfilment(value: string | undefined | null): FulfilmentMethod {
  const trimmed = value?.trim() ?? "";
  return KNOWN.has(trimmed) ? (trimmed as FulfilmentMethod) : "delivery";
}
