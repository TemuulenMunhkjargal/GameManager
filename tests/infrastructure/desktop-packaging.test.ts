import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
  version: string;
  scripts: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  build: {
    appId?: string;
    compression?: string;
    electronLanguages?: string[];
    files?: string[];
    extraResources?: { from: string; to: string }[];
  };
};
const desktopPackage = JSON.parse(readFileSync(path.join(root, "electron", "package.json"), "utf8")) as { version: string };
const nextConfig = readFileSync(path.join(root, "next.config.mjs"), "utf8");
const readme = readFileSync(path.join(root, "README.md"), "utf8");
const ciWorkflow = readFileSync(path.join(root, ".github", "workflows", "ci.yml"), "utf8");
const releaseWorkflow = readFileSync(path.join(root, ".github", "workflows", "release.yml"), "utf8")
  .replaceAll("\r\n", "\n");
const gitignore = readFileSync(path.join(root, ".gitignore"), "utf8").replaceAll("\r\n", "\n");
const electronMain = readFileSync(path.join(root, "electron", "main.cjs"), "utf8");
const releaseTableRoute = path.join(root, "src", "app", "api", "tables", "[tableId]", "release", "route.ts");

describe("desktop packaging", () => {
  it("classifies shipped server libraries as runtime dependencies without duplicating them in the Electron shell", () => {
    expect(packageJson.dependencies).toMatchObject({
      next: expect.any(String),
      react: expect.any(String),
      "react-dom": expect.any(String),
      "better-sqlite3": expect.any(String),
      "drizzle-orm": expect.any(String),
      zod: expect.any(String),
    });
    expect(packageJson.devDependencies).not.toHaveProperty("next");
    expect(packageJson.devDependencies).not.toHaveProperty("better-sqlite3");
    expect(packageJson.build.extraResources).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: ".next/standalone", to: "app-server" }),
      expect.objectContaining({ from: ".desktop-runtime", to: "runtime" }),
    ]));
  });

  it("uses compact release settings and synchronized versions", () => {
    expect(packageJson.build.appId).toBe("com.gamehall.desktop");
    expect(packageJson.scripts["desktop:build"]).toContain("--publish never");
    expect(packageJson.scripts["desktop:build"]).toContain("desktop:clean");
    expect(packageJson.build.compression).toBe("maximum");
    expect(packageJson.build.electronLanguages).toEqual(["en-US"]);
    expect(desktopPackage.version).toBe(packageJson.version);
    expect(packageJson.version).toBe("0.2.0");
    expect(nextConfig).toContain('"artifacts/**/*"');
    expect(nextConfig).toContain("unoptimized: true");
    expect(packageJson.build.files).toContain("runtime.cjs");
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
    expect(releaseWorkflow).toContain("does not match package version");
    expect(releaseWorkflow).toContain("Published releases are immutable");
    expect(releaseWorkflow).not.toContain("--clobber");
    expect(releaseWorkflow).not.toContain("if: startsWith(github.ref, 'refs/tags/')");
  });

  it("uses Node 24-compatible GitHub actions", () => {
    for (const workflow of [ciWorkflow, releaseWorkflow]) {
      expect(workflow).toContain("actions/checkout@v6");
      expect(workflow).toContain("actions/setup-node@v6");
      expect(workflow).not.toMatch(/actions\/(?:checkout|setup-node)@v4/);
    }
  });

  it("does not let generated release folders hide the table-release source route", () => {
    expect(gitignore).toContain("\n/release/\n");
    expect(gitignore).not.toMatch(/(?:^|\n)release\//);
    expect(existsSync(releaseTableRoute)).toBe(true);
    const ignored = spawnSync("git", ["check-ignore", "--quiet", "--", releaseTableRoute], { cwd: root });
    expect(ignored.status).toBe(1);
  });

  it("keeps Electron isolation and recovery controls enabled", () => {
    expect(electronMain).toContain("contextIsolation: true");
    expect(electronMain).toContain("nodeIntegration: false");
    expect(electronMain).toContain("sandbox: true");
    expect(electronMain).toContain('webContents.on("render-process-gone"');
    expect(electronMain).toContain('window.on("unresponsive"');
    expect(electronMain).toContain('webContents.on("did-fail-load"');
    expect(electronMain).toContain('stdio: ["ignore", "pipe", "pipe"]');
  });
});
