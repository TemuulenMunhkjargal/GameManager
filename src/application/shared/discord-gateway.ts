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
    venueName: string;
    eventDate: string;
    capacity: number;
    entryFeeInCents: number;
    publicUrl: string;
  }): Promise<void>;
}
