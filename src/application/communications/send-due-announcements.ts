import type { AnnouncementDeliveryService } from "./announcement-delivery-service";
import type { AnnouncementRepository } from "./ports";

export type SendDueAnnouncementsResult = {
  sent: number;
  failed: number;
};

export class SendDueAnnouncementsUseCase {
  public constructor(
    private readonly announcements: AnnouncementRepository,
    private readonly delivery: AnnouncementDeliveryService,
    private readonly appBaseUrl: string,
  ) {}

  /**
   * Not gated by requireEventManagement — this is invoked by a trusted
   * scheduled job (see /api/cron/send-announcements), not by a signed-in
   * staff member acting on a specific organization.
   */
  public async execute(now = new Date()): Promise<SendDueAnnouncementsResult> {
    const due = await this.announcements.findDueToSend(now);

    let sent = 0;
    let failed = 0;

    for (const announcement of due) {
      const result = await this.delivery.deliver(announcement, { appBaseUrl: this.appBaseUrl });

      if (result.ok) {
        await this.announcements.save(result.value);
        sent++;
        continue;
      }

      const failedResult = announcement.markFailed();

      if (failedResult.ok) {
        await this.announcements.save(failedResult.value);
      }

      failed++;
    }

    return { sent, failed };
  }
}
