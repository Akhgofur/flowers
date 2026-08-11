import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_ROOTS = [
  join(process.cwd(), "src"),
  join(process.cwd(), "messages"),
];
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".json", ".css", ".svg"]);

function collectProductionFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return collectProductionFiles(path);
    if (!TEXT_EXTENSIONS.has(extname(entry.name))) return [];
    if (/\.(?:test|spec)\.[^.]+$/.test(entry.name)) return [];

    return [path];
  });
}

describe("Floraluxe brand identity", () => {
  it("does not leak the retired brand name or order prefix into production UI", () => {
    const violations = SOURCE_ROOTS.flatMap(collectProductionFiles).flatMap((path) => {
      const content = readFileSync(path, "utf8");
      return /\bNafis\b|\bNAFIS\b|\bNF-/.test(content) ? [path] : [];
    });

    expect(violations).toEqual([]);
  });
});
