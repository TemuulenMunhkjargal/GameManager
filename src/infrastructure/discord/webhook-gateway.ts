import type { DiscordGateway } from "../../application/shared/discord-gateway";
import { parseDiscordWebhookUrl } from "../../lib/discord-webhook";

function formatMoney(cents: number): string { return cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`; }

function webhookUrl(value: string): URL {
  const url = parseDiscordWebhookUrl(value);
  if (!url) throw new Error("The stored Discord webhook URL is invalid.");
  url.searchParams.set("wait", "true");
  return url;
}

async function postWebhook(url: URL, payload: unknown): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Discord rejected the webhook (${response.status}).`);
  }
}

export class WebhookDiscordGateway implements DiscordGateway {
  public async sendEventAnnouncement(options: Parameters<DiscordGateway["sendEventAnnouncement"]>[0]): Promise<void> {
    const url = webhookUrl(options.webhookUrl);
    await postWebhook(url, {
      username: options.organizationName, allowed_mentions: { parse: [] }, embeds: [{ title: options.headline ?? options.eventTitle,
        description: options.description ?? `A new game night has been scheduled by **${options.organizationName}**.`, color: 0x71d09a,
        fields: [{ name: "Game", value: options.gameSystemLabel, inline: true }, { name: "Date", value: options.eventDate, inline: false },
          { name: "Capacity", value: `${options.capacity} seats`, inline: true }, { name: "Entry", value: formatMoney(options.entryFeeInCents), inline: true }],
        footer: { text: "Powered by GameHall" } }],
    });
  }

  public async sendLeagueAnnouncement(options: Parameters<DiscordGateway["sendLeagueAnnouncement"]>[0]): Promise<void> {
    const url = webhookUrl(options.webhookUrl);
    await postWebhook(url, {
      username: options.organizationName, allowed_mentions: { parse: [] }, embeds: [{
        title: options.headline, description: options.description, color: 0x71d09a,
        fields: [{ name: "League", value: options.leagueName, inline: true }, { name: "Game", value: options.gameSystemLabel, inline: true }, ...(options.fields ?? [])],
        footer: { text: "Powered by GameHall" },
      }],
    });
  }
}
