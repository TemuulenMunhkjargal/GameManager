import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

describe("client request resilience", () => {
  it("routes client-component requests through the timeout-safe API helper", () => {
    const directFetches = filesUnder(join(process.cwd(), "src", "app"))
      .filter((path) => path.endsWith(".tsx"))
      .filter((path) => {
        const source = readFileSync(path, "utf8");
        return source.includes('"use client"') && /\bfetch\s*\(/.test(source);
      })
      .map((path) => path.replace(`${process.cwd()}\\`, ""));

    expect(directFetches).toEqual([]);
  });
});
