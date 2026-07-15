import { describe, expect, it } from "vitest";
import { getLeagueFormat, LEAGUE_FORMATS } from "../../src/lib/league-formats";

describe("league format catalog", () => {
  it("provides unique, explained format choices", () => {
    expect(new Set(LEAGUE_FORMATS.map((format) => format.value)).size).toBe(LEAGUE_FORMATS.length);
    expect(LEAGUE_FORMATS.length).toBeGreaterThanOrEqual(10);
    expect(LEAGUE_FORMATS.every((format) => format.explanation && format.bestFor)).toBe(true);
  });

  it("uses point awards for multiplayer and narrative formats", () => {
    expect(getLeagueFormat("free_for_all").resultMode).toBe("points");
    expect(getLeagueFormat("campaign").resultMode).toBe("points");
    expect(getLeagueFormat("swiss").resultMode).toBe("head_to_head");
  });
});
