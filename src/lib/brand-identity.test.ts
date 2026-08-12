import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_ROOTS = [
  join(process.cwd(), "src"),
  join(process.cwd(), "messages"),
];
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".json", ".css", ".svg"]);

function collectFiles(
  directory: string,
  { includeTests }: { includeTests: boolean }
): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return collectFiles(path, { includeTests });
    if (!TEXT_EXTENSIONS.has(extname(entry.name))) return [];
    if (!includeTests && /\.(?:test|spec)\.[^.]+$/.test(entry.name)) return [];

    return [path];
  });
}

const collectProductionFiles = (directory: string) =>
  collectFiles(directory, { includeTests: false });

/** Capitalised brand usages and the retired order-number prefix. */
const RETIRED_BRAND_COPY = /\bNafis\b|\bNAFIS\b|\bNF-/;

/**
 * Lowercase `nafis` only counts when it reads as an identifier — `nafis.cart.v1`,
 * `nafis-admin`, `__nafisFlowersCache`. Plain Uzbek prose ("nafis qadoq", "juda
 * nafis.") is a different word and must keep working.
 */
const RETIRED_BRAND_IDENTIFIER = /nafis[-_]|nafis\.[a-z]|nafis[A-Z]/;

describe("Floraluxe brand identity", () => {
  it("does not leak the retired brand name or order prefix into production UI", () => {
    const violations = SOURCE_ROOTS.flatMap(collectProductionFiles).flatMap((path) => {
      const content = readFileSync(path, "utf8");
      return RETIRED_BRAND_COPY.test(content) ? [path] : [];
    });

    expect(violations).toEqual([]);
  });

  /**
   * Only files that must name the retired keys in order to retire them: the
   * storage migration, its test, and this guard's own fixtures.
   */
  const IDENTIFIER_EXCEPTIONS = [
    join("features", "cart", "cart-storage.ts"),
    join("features", "cart", "cart-storage-migration.test.ts"),
    join("lib", "brand-identity.test.ts"),
  ];

  // Tests are scanned too: fixture cloud names like `nafis-test` survived the
  // whole rebrand precisely because the production-only scan never saw them.
  it("does not leave retired brand identifiers in storage keys, ids or globals", () => {
    const violations = SOURCE_ROOTS.flatMap((root) =>
      collectFiles(root, { includeTests: true })
    ).flatMap((path) => {
      if (IDENTIFIER_EXCEPTIONS.some((allowed) => path.endsWith(allowed))) return [];

      const content = readFileSync(path, "utf8");
      return RETIRED_BRAND_IDENTIFIER.test(content) ? [path] : [];
    });

    expect(violations).toEqual([]);
  });

  it("still allows nafis as an ordinary Uzbek adjective", () => {
    expect(RETIRED_BRAND_IDENTIFIER.test("nafis qadoqni bir buyurtmada jamlang")).toBe(false);
    expect(RETIRED_BRAND_IDENTIFIER.test("Bu buket juda nafis.")).toBe(false);
    expect(RETIRED_BRAND_IDENTIFIER.test("nafislik qo‘shadigan orkide")).toBe(false);
    expect(RETIRED_BRAND_IDENTIFIER.test('"nafis.cart.v1"')).toBe(true);
    expect(RETIRED_BRAND_IDENTIFIER.test('id: "nafis-admin"')).toBe(true);
    expect(RETIRED_BRAND_IDENTIFIER.test("__nafisFlowersMongooseCache")).toBe(true);
  });
});
