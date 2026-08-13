import { describe, expect, it } from "vitest";
import {
  formatGeoPoint,
  isValidGeoPoint,
  parseGeoPoint,
  roundGeoPoint,
} from "./geo-point";

const TASHKENT = { latitude: 41.311081, longitude: 69.240562 };

describe("parseGeoPoint", () => {
  it("reads a bare coordinate pair however it is separated", () => {
    expect(parseGeoPoint("41.311081, 69.240562")).toEqual(TASHKENT);
    expect(parseGeoPoint("41.311081 69.240562")).toEqual(TASHKENT);
    expect(parseGeoPoint("  41.311081;69.240562  ")).toEqual(TASHKENT);
  });

  /**
   * Yandex writes longitude first in its point parameters. Reading one as
   * latitude mirrors the pin into another country, which is worse than refusing
   * the link, so the order is pinned down by test.
   */
  it("reads a Yandex link longitude-first", () => {
    expect(parseGeoPoint("https://yandex.uz/maps/?pt=69.240562,41.311081&z=17")).toEqual(
      TASHKENT
    );
    expect(parseGeoPoint("https://yandex.ru/maps/10335/tashkent/?ll=69.240562%2C41.311081&z=16")).toEqual(
      TASHKENT
    );
  });

  it("reads a Yandex route destination latitude-first", () => {
    expect(
      parseGeoPoint("https://yandex.uz/maps/?rtext=41.2,69.1~41.311081,69.240562&rtt=taxi")
    ).toEqual(TASHKENT);
  });

  it("reads Google links from either the query or the path", () => {
    expect(
      parseGeoPoint("https://www.google.com/maps/search/?api=1&query=41.311081,69.240562")
    ).toEqual(TASHKENT);
    expect(
      parseGeoPoint("https://www.google.com/maps/place/Floraluxe/@41.311081,69.240562,17z")
    ).toEqual(TASHKENT);
    expect(parseGeoPoint("https://maps.google.com/?q=41.311081,69.240562")).toEqual(TASHKENT);
  });

  it("reads a phone share-sheet geo URI", () => {
    expect(parseGeoPoint("geo:41.311081,69.240562")).toEqual(TASHKENT);
  });

  it("finds the link inside a pasted sentence", () => {
    expect(
      parseGeoPoint("Mana manzilim: https://yandex.uz/maps/?pt=69.240562,41.311081 rahmat")
    ).toEqual(TASHKENT);
  });

  it("accepts a decimal comma, which a phone keyboard produces", () => {
    expect(parseGeoPoint("41,311081 69,240562")).toEqual(TASHKENT);
  });

  it("refuses text with no usable point rather than guessing one", () => {
    expect(parseGeoPoint("")).toBeNull();
    expect(parseGeoPoint("Chilonzor tumani, 12-uy")).toBeNull();
    expect(parseGeoPoint("https://yandex.uz/maps/10335/tashkent/")).toBeNull();
    // Latitude only reaches 90; this is a longitude pair pasted the wrong way round.
    expect(parseGeoPoint("169.24, 41.31")).toBeNull();
  });
});

describe("geo point values", () => {
  it("rejects points outside the planet", () => {
    expect(isValidGeoPoint(TASHKENT)).toBe(true);
    expect(isValidGeoPoint({ latitude: 91, longitude: 0 })).toBe(false);
    expect(isValidGeoPoint({ latitude: 0, longitude: -181 })).toBe(false);
    expect(isValidGeoPoint({ latitude: Number.NaN, longitude: 0 })).toBe(false);
  });

  it("trims GPS noise to a doorway's worth of precision", () => {
    expect(roundGeoPoint({ latitude: 41.31108123456, longitude: 69.2405621234 })).toEqual(
      TASHKENT
    );
    expect(formatGeoPoint({ latitude: 41.31108123456, longitude: 69.2405621234 })).toBe(
      "41.311081, 69.240562"
    );
  });
});
