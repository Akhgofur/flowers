import { describe, expect, it } from "vitest";
import { assertManifestCoversSources, digest } from "./bouquet-import";

/**
 * The manifest is written by hand against a folder of photographs, so the two
 * drift silently: a forgotten file loses a bouquet from the shop, a pasted one
 * lists the same bouquet twice. Both have to fail before anything is uploaded.
 */
describe("bouquet import manifest", () => {
  const onDisk = ["a.png", "b.png", "c.png"];

  it("accepts a manifest that claims every file exactly once", () => {
    expect(() => assertManifestCoversSources(onDisk, ["c.png", "a.png", "b.png"])).not.toThrow();
  });

  it("refuses a photograph no bouquet claims", () => {
    expect(() => assertManifestCoversSources(onDisk, ["a.png", "b.png"])).toThrow(/c\.png/);
  });

  it("refuses a manifest naming a file that is not there", () => {
    expect(() =>
      assertManifestCoversSources(onDisk, ["a.png", "b.png", "c.png", "gone.png"])
    ).toThrow(/gone\.png/);
  });

  it("refuses the same photograph claimed twice", () => {
    expect(() =>
      assertManifestCoversSources(onDisk, ["a.png", "a.png", "b.png", "c.png"])
    ).toThrow(/a\.png/);
  });
});

describe("bouquet import slugs", () => {
  it("derives a stable short id so a re-run updates rather than duplicates", () => {
    expect(digest("photo_1.png")).toBe(digest("photo_1.png"));
    expect(digest("photo_1.png")).toHaveLength(10);
    expect(digest("photo_1.png")).not.toBe(digest("photo_2.png"));
  });

  it("keys a gallery on its whole file list, not just the first image", () => {
    expect(digest("a.png|b.png")).not.toBe(digest("a.png"));
  });
});
