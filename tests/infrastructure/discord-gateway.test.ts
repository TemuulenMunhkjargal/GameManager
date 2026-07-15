import { afterEach, describe, expect, it, vi } from "vitest";
import { WebhookDiscordGateway } from "@/infrastructure/discord/webhook-gateway";

afterEach(() => vi.restoreAllMocks());

describe("WebhookDiscordGateway league announcements", () => {
  it("sends a green GameHall league embed without Discord mentions", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    await new WebhookDiscordGateway().sendLeagueAnnouncement({ webhookUrl: "https://discord.com/api/webhooks/1/token", organizationName: "My Game Nights", leagueName: "Summer League", gameSystemLabel: "Magic: The Gathering", headline: "New league created", description: "Registration is open.", fields: [{ name: "Starts", value: "July 20" }] });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(request?.body));
    expect(String(url)).toContain("wait=true");
    expect(body.allowed_mentions).toEqual({ parse: [] });
    expect(body.embeds[0]).toMatchObject({ title: "New league created", color: 0x71d09a });
    expect(body.embeds[0].fields).toEqual(expect.arrayContaining([{ name: "League", value: "Summer League", inline: true }, { name: "Game", value: "Magic: The Gathering", inline: true }]));
  });
});
