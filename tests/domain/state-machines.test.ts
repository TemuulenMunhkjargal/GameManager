import { describe, expect, it } from "vitest";
import { League } from "../../src/domain/leagues/league";
import { Registration } from "../../src/domain/registrations/registration";
import { GameSystem } from "../../src/domain/game-systems/game-system";

describe("domain state transitions", () => {
  it("starts and completes a league only in order", () => {
    const draft = new League("league_1", "org_mana_vault", null, "Chess", "League", "", "round_robin", "draft", null, null);
    const started = draft.start(); expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.value.complete().ok).toBe(true);
    expect(draft.complete().ok).toBe(false);
    expect(started.value.format).toBe("round_robin");
  });

  it("prevents cancelling a checked-in registration", () => {
    const registration = new Registration("reg_1", "event_1", "member_1", "checked_in", new Date(), new Date());
    expect(registration.cancel().ok).toBe(false);
  });

  it("normalizes game names into stable slugs", () => {
    const result = GameSystem.create({ id: "game_1", organizationId: "org_mana_vault", name: "  D&D 5e! ", type: "ttrpg", defaultCapacity: 6, notes: "" });
    expect(result.ok).toBe(true); if (result.ok) expect(result.value.slug).toBe("d-d-5e");
  });
});
