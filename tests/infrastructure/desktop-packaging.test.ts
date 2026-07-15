import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  build: {
    appId?: string;
    compression?: string;
    electronLanguages?: string[];
    extraResources?: { from: string; to: string }[];
  };
};
const desktopPackage = JSON.parse(readFileSync(path.join(root, "electron", "package.json"), "utf8")) as { version: string };
const readme = readFileSync(path.join(root, "README.md"), "utf8");
const releaseWorkflow = readFileSync(path.join(root, ".github", "workflows", "release.yml"), "utf8")
  .replaceAll("\r\n", "\n");

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
    expect(packageJson.build.appId).toBe("com.gamehall.desktop");
    expect(packageJson.build.compression).toBe("maximum");
    expect(packageJson.build.electronLanguages).toEqual(["en-US"]);
    expect(desktopPackage.version).toBe(packageJson.version);
  });

  it("keeps the public README focused on installing the desktop application", () => {
    expect(readme).toContain("releases/latest/download/GameHall-Setup.exe");
    expect(readme).not.toMatch(/npm (?:install|run)/i);
    expect(readme).not.toMatch(/localhost/i);
  });

  it("publishes a stable installer asset from manual and tagged releases", () => {
    expect(releaseWorkflow).toContain("workflow_dispatch:");
    expect(releaseWorkflow).toMatch(/(?:^|\n)\s*tags:\s*\n\s*-\s*["']v\*["']/);
    expect(releaseWorkflow).toContain("release/GameHall-Setup.exe");
    expect(releaseWorkflow).toContain("gh release create");
    expect(releaseWorkflow).not.toContain("if: startsWith(github.ref, 'refs/tags/')");
  });
});
