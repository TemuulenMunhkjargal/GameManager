import type { DiscordGateway } from "../../application/shared/discord-gateway";

function formatMoney(cents: number): string { return cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`; }

export class WebhookDiscordGateway implements DiscordGateway {
  public async sendEventAnnouncement(options: Parameters<DiscordGateway["sendEventAnnouncement"]>[0]): Promise<void> {
    const url = new URL(options.webhookUrl); url.searchParams.set("wait", "true");
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      username: options.organizationName, allowed_mentions: { parse: [] }, embeds: [{ title: options.eventTitle,
        description: `A new game night has been scheduled by **${options.organizationName}**.`, color: 0x71d09a,
        fields: [{ name: "Game", value: options.gameSystemLabel, inline: true }, { name: "Date", value: options.eventDate, inline: false },
          { name: "Capacity", value: `${options.capacity} seats`, inline: true }, { name: "Entry", value: formatMoney(options.entryFeeInCents), inline: true }],
        footer: { text: "Powered by GameHall" } }] }) });
    if (!response.ok) console.error("[WebhookDiscordGateway] Discord rejected announcement:", response.status);
  }

  public async sendLeagueAnnouncement(options: Parameters<DiscordGateway["sendLeagueAnnouncement"]>[0]): Promise<void> {
    const url = new URL(options.webhookUrl); url.searchParams.set("wait", "true");
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      username: options.organizationName, allowed_mentions: { parse: [] }, embeds: [{
        title: options.headline, description: options.description, color: 0x71d09a,
        fields: [{ name: "League", value: options.leagueName, inline: true }, { name: "Game", value: options.gameSystemLabel, inline: true }, ...(options.fields ?? [])],
        footer: { text: "Powered by GameHall" },
      }],
    }) });
    if (!response.ok) console.error("[WebhookDiscordGateway] Discord rejected league announcement:", response.status);
  }
}
