import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALES, isLocale } from "./config";

describe("locale configuration", () => {
  it("uses Russian as the explicit default among exactly three locales", () => {
    expect(LOCALES).toEqual(["ru", "uz", "en"]);
    expect(DEFAULT_LOCALE).toBe("ru");
  });

  it.each(["ru", "uz", "en"])("accepts %s", (locale) => {
    expect(isLocale(locale)).toBe(true);
  });

  it.each([undefined, "", "gullar", "de", "RU"])("rejects %s", (locale) => {
    expect(isLocale(locale)).toBe(false);
  });
});
