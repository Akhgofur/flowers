import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import uz from "../../messages/uz.json";

const REQUIRED_NAMESPACES = [
  "Metadata",
  "Header",
  "Hero",
  "Categories",
  "Promo",
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

  it("uses natural Russian plural forms for catalog result counts", () => {
    const t = createTranslator({ locale: "ru", messages: ru, namespace: "Catalog" });

    expect(t("resultCount", { count: 1 })).toBe("1 результат");
    expect(t("resultCount", { count: 2 })).toBe("2 результата");
    expect(t("resultCount", { count: 5 })).toBe("5 результатов");
  });
});
