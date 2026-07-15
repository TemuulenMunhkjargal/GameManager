import { describe, expect, it } from "vitest";
import { normalizeTheme } from "@/lib/theme";

describe("normalizeTheme", () => {
  it.each(["default", "light", "dark"])("accepts the %s theme", (theme) => {
    expect(normalizeTheme(theme)).toBe(theme);
  });

  it.each([null, "", "unknown"])("falls back to the default theme for %s", (theme) => {
    expect(normalizeTheme(theme)).toBe("default");
  });
});
