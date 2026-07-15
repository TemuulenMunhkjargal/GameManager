import { describe, expect, it } from "vitest";
import { commonGames, resolveGameChoice } from "@/lib/game-catalog";

describe("common game catalog", () => {
  it("includes popular card, role-playing, miniature, and board games", () => {
    expect(commonGames.map((game) => game.label)).toEqual(expect.arrayContaining(["Magic: The Gathering", "Pokémon Trading Card Game", "Dungeons & Dragons", "Warhammer 40,000", "Catan"]));
    expect(commonGames.length).toBeGreaterThanOrEqual(20);
  });

  it("resolves catalog, saved, and other choices", () => {
    expect(resolveGameChoice("catalog:magic", "", []).label).toBe("Magic: The Gathering");
    expect(resolveGameChoice("saved", "", [{ id: "saved", name: "My Game", defaultCapacity: 3 }])).toEqual({ label: "My Game", gameSystemId: "saved", defaultCapacity: 3 });
    expect(resolveGameChoice("__other__", "  Custom  ", []).label).toBe("Custom");
  });
});
