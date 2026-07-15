import { describe, expect, it } from "vitest";
import { Event } from "../../src/domain/events/event";

describe("Event", () => {
  it("rejects an end time before the start", () => {
    expect(() => new Event("event_1", "org_mana_vault", "Bad", "", "draft", "private",
      new Date("2030-01-01T20:00:00Z"), new Date("2030-01-01T19:00:00Z"), 4, 0, true,
      null, null, "Chess", null, "Local", null, null)).toThrow("after start");
  });

  it("waitlists when a published event is full", () => {
    const full = new Event("event_1", "org_mana_vault", "Full", "", "published", "private",
      new Date("2030-01-01T18:00:00Z"), new Date("2030-01-01T21:00:00Z"), 4, 4, true,
      null, null, "Chess", null, "Local", null, null);
    expect(full.canRegister(new Date("2029-01-01T00:00:00Z"))).toEqual({ ok: true, value: "waitlisted" });
  });

  it("will not reduce capacity below confirmed attendance", () => {
    const current = new Event("event_1", "org_mana_vault", "Game", "", "published", "private",
      new Date("2030-01-01T18:00:00Z"), new Date("2030-01-01T21:00:00Z"), 8, 5, true,
      null, null, "Chess", null, "Local", null, null);
    const result = current.updateDetails({ title: "Game", description: "", gameSystemLabel: "Chess", gameSystemId: null,
      venueId: null, venueName: "Local", roomId: null, roomName: null,
      startsAt: current.startsAt, endsAt: current.endsAt, capacity: 4, entryFeeInCents: 0, waitlistEnabled: true });
    expect(result.ok).toBe(false);
  });
});
