import { describe, expect, it } from "vitest";
import { splitArchivedEvents } from "@/lib/event-archive";
import type { EventSummaryDTO } from "@/application/events/ports";

function event(index: number): EventSummaryDTO {
  return { id: `event_${index}`, title: `Event ${index}`, gameSystemLabel: "Game", gameSystemId: null, venueName: "", startsAt: new Date(Date.UTC(2029, 0, index + 1)).toISOString(), endsAt: new Date(Date.UTC(2029, 0, index + 1, 2)).toISOString(), capacity: 4, confirmedCount: 0, waitlistCount: 0, entryFeeInCents: 0, status: "completed", visibility: "private", waitlistEnabled: false };
}

describe("archived event retention", () => {
  it("keeps the newest 100 past events and expires older history", () => {
    const result = splitArchivedEvents(Array.from({ length: 105 }, (_, index) => event(index)), new Date("2031-01-01"));
    expect(result.retained).toHaveLength(100);
    expect(result.expired).toHaveLength(5);
    expect(result.retained[0].id).toBe("event_104");
  });

  it("does not archive future events", () => {
    expect(splitArchivedEvents([event(0)], new Date("2028-01-01")).retained).toHaveLength(0);
  });
});
