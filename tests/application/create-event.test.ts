import { describe, expect, it, vi } from "vitest";
import { CreateEventUseCase } from "@/application/events/create-event";
import type { EventRepository } from "@/application/events/ports";
import type { OrganizationRepository } from "@/application/organizations/ports";
import type { DiscordGateway } from "@/application/shared/discord-gateway";
import { Organization } from "@/domain/organizations/organization";

describe("CreateEventUseCase Discord delivery", () => {
  it("returns the persisted event when Discord rejects the announcement", async () => {
    const save = vi.fn(async () => undefined);
    const events: EventRepository = {
      findByIdForOrganization: vi.fn(async () => null),
      save,
      deleteMany: vi.fn(async () => 0),
    };
    const organization = new Organization(
      "org_1",
      "Friday Games",
      "America/Chicago",
      "",
      true,
      "https://discord.com/api/webhooks/1/token",
    );
    const organizations: OrganizationRepository = {
      findById: vi.fn(async () => organization),
      save: vi.fn(async () => undefined),
    };
    const discord: DiscordGateway = {
      sendEventAnnouncement: vi.fn(async () => { throw new Error("Discord is offline"); }),
      sendLeagueAnnouncement: vi.fn(async () => undefined),
    };
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await new CreateEventUseCase(events, organizations, discord, () => "event_1").execute({
      organizationId: "org_1",
      title: "Commander night",
      description: "",
      gameSystemLabel: "Magic: The Gathering",
      startsAt: new Date("2030-06-01T18:00:00Z"),
      endsAt: new Date("2030-06-01T22:00:00Z"),
      capacity: 8,
      gameSystemId: null,
      entryFeeInCents: 0,
      waitlistEnabled: true,
      publishImmediately: true,
    });

    expect(result.ok).toBe(true);
    expect(save).toHaveBeenCalledOnce();
    expect(discord.sendEventAnnouncement).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith("[event-discord:created]", expect.any(Error));
    consoleError.mockRestore();
  });
});
