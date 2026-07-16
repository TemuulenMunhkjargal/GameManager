import { describe, expect, it } from "vitest";
import { ArchiveEventUseCase, MaintainEventArchiveUseCase } from "../../src/application/events/event-archive";
import type { EventDetailDTO, EventQueries, EventRepository, EventSummaryDTO } from "../../src/application/events/ports";
import { Event } from "../../src/domain/events/event";

function event(index: number): EventSummaryDTO {
  return {
    id: `event_${index}`,
    title: `Event ${index}`,
    gameSystemLabel: "Game",
    gameSystemId: null,
    venueName: "Local",
    startsAt: new Date(Date.UTC(2029, 0, index + 1)).toISOString(),
    endsAt: new Date(Date.UTC(2029, 0, index + 1, 2)).toISOString(),
    capacity: 4,
    confirmedCount: 0,
    waitlistCount: 0,
    entryFeeInCents: 0,
    status: "completed",
    visibility: "private",
    waitlistEnabled: false,
    archivedAt: null,
  };
}

class FakeEventStore implements EventRepository, EventQueries {
  public deleted: string[] = [];

  public constructor(private summaries: EventSummaryDTO[]) {}

  public async findByIdForOrganization(): Promise<Event | null> { return null; }
  public async save(): Promise<void> {}
  public async getDetail(): Promise<EventDetailDTO | null> { return null; }
  public async listForOrganization(): Promise<EventSummaryDTO[]> { return this.summaries; }

  public async deleteMany(eventIds: string[]): Promise<number> {
    this.deleted.push(...eventIds);
    this.summaries = this.summaries.filter((event) => !eventIds.includes(event.id));
    return eventIds.length;
  }
}

describe("MaintainEventArchiveUseCase", () => {
  it("transactionally delegates only the oldest events beyond the 100-event limit for deletion", async () => {
    const store = new FakeEventStore(Array.from({ length: 105 }, (_, index) => event(index)));
    const result = await new MaintainEventArchiveUseCase(store, store).execute({
      organizationId: "org_mana_vault",
      now: new Date("2031-01-01T00:00:00.000Z"),
    });

    expect(result).toEqual({ purged: 5 });
    expect(store.deleted.sort()).toEqual(["event_0", "event_1", "event_2", "event_3", "event_4"]);
  });

  it("does not delete anything while the archive remains within its limit", async () => {
    const store = new FakeEventStore(Array.from({ length: 100 }, (_, index) => event(index)));
    const result = await new MaintainEventArchiveUseCase(store, store).execute({
      organizationId: "org_mana_vault",
      now: new Date("2031-01-01T00:00:00.000Z"),
    });

    expect(result).toEqual({ purged: 0 });
    expect(store.deleted).toEqual([]);
  });
});

describe("ArchiveEventUseCase", () => {
  it("soft-archives the event instead of deleting it", async () => {
    const current = new Event("event_1", "org_mana_vault", "Future event", "", "published", "private",
      new Date("2031-01-01T18:00:00.000Z"), new Date("2031-01-01T21:00:00.000Z"), 8, 0, true,
      null, null, "Chess", null, "Local", null, null);
    let saved: Event | null = null;
    let permanentlyDeleted = false;
    const repository: EventRepository = {
      findByIdForOrganization: async () => current,
      save: async (value) => { saved = value; },
      deleteMany: async () => { permanentlyDeleted = true; return 1; },
    };
    const now = new Date("2030-01-01T00:00:00.000Z");

    const result = await new ArchiveEventUseCase(repository).execute({
      organizationId: "org_mana_vault",
      eventId: "event_1",
      now,
    });

    expect(result.ok).toBe(true);
    expect(saved).not.toBeNull();
    expect((saved as Event | null)?.archivedAt).toEqual(now);
    expect(permanentlyDeleted).toBe(false);
  });
});
