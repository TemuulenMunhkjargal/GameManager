import type { DiscordGateway } from "../../application/shared/discord-gateway";

export class ConsoleDiscordGateway implements DiscordGateway {
  public async sendEventAnnouncement(
    options: Parameters<DiscordGateway["sendEventAnnouncement"]>[0],
  ): Promise<void> {
    console.log("[discord:eventAnnouncement]", JSON.stringify(options, null, 2));
  }
}
