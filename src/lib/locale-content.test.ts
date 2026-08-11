import { describe, expect, it } from "vitest";
import {
  resolveCategoryTranslation,
  resolveProductTranslation,
} from "./locale-content";

const productTranslations = {
  ru: {
    name: "Букет алых роз",
    shortDescription: "Бархатные розы для важных признаний.",
    description: "Авторский букет из свежих алых роз.",
    composition: ["25 алых роз", "Эвкалипт"],
  },
  uz: {
    name: "Qirmizi atirgul buketi",
    shortDescription: "Muhim izhorlar uchun baxmaldek atirgullar.",
    description: "Yangi qirmizi atirgullardan mualliflik buketi.",
    composition: ["25 ta qirmizi atirgul", "Evkalipt"],
  },
  en: {
    name: "Scarlet rose bouquet",
    shortDescription: "Velvet roses for meaningful declarations.",
    description: "A signature bouquet of fresh scarlet roses.",
    composition: ["25 scarlet roses", "Eucalyptus"],
  },
};

describe("localized catalog content", () => {
  it("returns only the requested product translation", () => {
    expect(
      resolveProductTranslation({ translations: productTranslations }, "en")
    ).toEqual(productTranslations.en);
  });

  it("uses Russian only as a migration fallback", () => {
    expect(
      resolveProductTranslation(
        { translations: { ru: productTranslations.ru } },
        "uz"
      )
    ).toEqual(productTranslations.ru);
  });

  it("rejects incomplete product content instead of leaking partial data", () => {
    expect(
      resolveProductTranslation(
        {
          translations: {
            en: { ...productTranslations.en, composition: [] },
          },
        },
        "en"
      )
    ).toBeNull();
  });

  it("resolves category content for the selected locale", () => {
    expect(
      resolveCategoryTranslation(
        {
          translations: {
            ru: { name: "Розы" },
            uz: { name: "Atirgullar" },
            en: { name: "Roses" },
          },
        },
        "en"
      )
    ).toEqual({ name: "Roses" });
  });
});
