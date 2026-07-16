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

  it("rejects a non-Discord URL even when it came from restored settings", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(new WebhookDiscordGateway().sendLeagueAnnouncement({
      webhookUrl: "http://127.0.0.1:3000/api/backups",
      organizationName: "My Game Nights",
      leagueName: "Summer League",
      gameSystemLabel: "Chess",
      headline: "League update",
      description: "Test",
    })).rejects.toThrow("stored Discord webhook URL is invalid");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects Discord HTTP failures so announcements are not marked sent", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));

    await expect(new WebhookDiscordGateway().sendLeagueAnnouncement({
      webhookUrl: "https://discord.com/api/webhooks/1/deleted-token",
      organizationName: "My Game Nights",
      leagueName: "Summer League",
      gameSystemLabel: "Chess",
      headline: "League update",
      description: "Test",
    })).rejects.toThrow("Discord rejected the webhook (404)");
  });
});
