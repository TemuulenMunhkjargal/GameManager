/**
 * The application layer's only view of Discord. Use cases call this interface;
 * the webhook adapter in src/infrastructure/discord/ implements it.
 */
export interface DiscordGateway {
  sendEventAnnouncement(options: {
    webhookUrl: string;
    organizationName: string;
    eventTitle: string;
    gameSystemLabel: string;
    eventDate: string;
    capacity: number;
    entryFeeInCents: number;
    headline?: string;
    description?: string;
  }): Promise<void>;
  sendLeagueAnnouncement(options: {
    webhookUrl: string;
    organizationName: string;
    leagueName: string;
    gameSystemLabel: string;
    headline: string;
    description: string;
    fields?: { name: string; value: string; inline?: boolean }[];
  }): Promise<void>;
}
