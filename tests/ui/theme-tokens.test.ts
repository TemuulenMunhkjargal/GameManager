import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(process.cwd(), "src", "app", "globals.css"), "utf8");

describe("GameHall theme CSS", () => {
  it("does not reintroduce the former blue palette", () => {
    const formerBlueColors = [
      "#66c0f4", "#2a6d9b", "#294b66", "#223b50", "#3f9fd2", "#172638",
      "#142436", "#1c3043", "#4da9d8", "#70d0ff", "#409bc9", "#29465e",
    ];
    for (const color of formerBlueColors) expect(css.toLowerCase()).not.toContain(color);
  });

  it("uses shared theme tokens for form controls and table headers", () => {
    expect(css).toContain(".field input, .field textarea, .field select");
    expect(css).toMatch(/th\s*{[^}]*background:\s*var\(--surface-muted\)/s);
  });
});
