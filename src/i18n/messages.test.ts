import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uz from "../../messages/uz.json";

const REQUIRED_NAMESPACES = [
  "Metadata",
  "Header",
  "Hero",
  "Catalog",
  "Product",
  "Cart",
  "Checkout",
  "Footer",
  "Errors",
] as const;

function collectLeafPaths(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`Message value at ${prefix || "<root>"} must be an object or string.`);
  }

  return Object.entries(value)
    .flatMap(([key, child]) => collectLeafPaths(child, prefix ? `${prefix}.${key}` : key))
    .sort();
}

describe("message catalogs", () => {
  const catalogs = { ru, uz, en } as const;

  it("contains every required namespace in every locale", () => {
    for (const messages of Object.values(catalogs)) {
      expect(Object.keys(messages)).toEqual(
        expect.arrayContaining([...REQUIRED_NAMESPACES])
      );
    }
  });

  it("keeps identical leaf keys for Russian, Uzbek and English", () => {
    const russianKeys = collectLeafPaths(ru);
    expect(collectLeafPaths(uz)).toEqual(russianKeys);
    expect(collectLeafPaths(en)).toEqual(russianKeys);
  });

  it("never ships empty customer-facing messages", () => {
    for (const messages of Object.values(catalogs)) {
      const visit = (value: unknown): void => {
        if (typeof value === "string") {
          expect(value.trim()).not.toBe("");
          return;
        }
        Object.values(value as Record<string, unknown>).forEach(visit);
      };
      visit(messages);
    }
  });
});
