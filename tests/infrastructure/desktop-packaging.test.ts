import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  build: {
    compression?: string;
    electronLanguages?: string[];
    extraResources?: { from: string; to: string }[];
  };
};
const desktopPackage = JSON.parse(readFileSync(path.join(root, "electron", "package.json"), "utf8")) as { version: string };

describe("desktop packaging", () => {
  it("does not duplicate root dependencies inside the Electron shell", () => {
    expect(Object.keys(packageJson.dependencies ?? {})).toHaveLength(0);
    expect(packageJson.devDependencies).toMatchObject({ next: expect.any(String), "better-sqlite3": expect.any(String) });
    expect(packageJson.build.extraResources).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: ".next/standalone", to: "app-server" }),
      expect.objectContaining({ from: ".desktop-runtime", to: "runtime" }),
    ]));
  });

  it("uses compact release settings and synchronized versions", () => {
    expect(packageJson.build.compression).toBe("maximum");
    expect(packageJson.build.electronLanguages).toEqual(["en-US"]);
    expect(desktopPackage.version).toBe(packageJson.version);
  });
});
