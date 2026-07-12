import type { DiscordGateway } from "../../application/shared/discord-gateway";

function formatMoney(cents: number): string {
  return cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`;
}

export class WebhookDiscordGateway implements DiscordGateway {
  public async sendEventAnnouncement(options: {
    webhookUrl: string;
    organizationName: string;
    eventTitle: string;
    gameSystemLabel: string;
    venueName: string;
    eventDate: string;
    capacity: number;
    entryFeeInCents: number;
    publicUrl: string;
  }): Promise<void> {
    const payload = {
      username: options.organizationName,
      embeds: [
        {
          title: `🎲 ${options.eventTitle}`,
          description: `A new event has been posted at **${options.organizationName}**. Grab your seat before it fills up!`,
          color: 0x2d5016, // --accent-dark
          fields: [
            { name: "Game", value: options.gameSystemLabel, inline: true },
            { name: "Venue", value: options.venueName, inline: true },
            { name: "Date", value: options.eventDate, inline: false },
            { name: "Capacity", value: `${options.capacity} seats`, inline: true },
            { name: "Entry", value: formatMoney(options.entryFeeInCents), inline: true },
          ],
          url: options.publicUrl,
          footer: { text: "Powered by CritTable" },
        },
      ],
    };

    const response = await fetch(options.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Log but don't throw — Discord failure never breaks the primary action.
      console.error(
        "[WebhookDiscordGateway] webhook post failed:",
        response.status,
        await response.text().catch(() => ""),
      );
    }
  }
}
