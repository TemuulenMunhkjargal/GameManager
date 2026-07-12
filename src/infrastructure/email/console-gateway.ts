import type { EmailGateway } from "../../application/shared/email-gateway";

/**
 * Used when RESEND_API_KEY is not set. Logs emails to the console so
 * you can see what would have been sent without hitting the real API.
 */
export class ConsoleEmailGateway implements EmailGateway {
  private log(method: string, options: Record<string, unknown>): void {
    console.log(`[email:${method}]`, JSON.stringify(options, null, 2));
  }

  public async sendTeamInvite(options: Parameters<EmailGateway["sendTeamInvite"]>[0]): Promise<void> {
    this.log("teamInvite", options);
  }

  public async sendRsvpConfirmation(options: Parameters<EmailGateway["sendRsvpConfirmation"]>[0]): Promise<void> {
    this.log("rsvpConfirmation", options);
  }

  public async sendWaitlistConfirmation(options: Parameters<EmailGateway["sendWaitlistConfirmation"]>[0]): Promise<void> {
    this.log("waitlistConfirmation", options);
  }

  public async sendWaitlistPromotion(options: Parameters<EmailGateway["sendWaitlistPromotion"]>[0]): Promise<void> {
    this.log("waitlistPromotion", options);
  }

  public async sendPaymentConfirmation(options: Parameters<EmailGateway["sendPaymentConfirmation"]>[0]): Promise<void> {
    this.log("paymentConfirmation", options);
  }

  public async sendEmailVerification(options: Parameters<EmailGateway["sendEmailVerification"]>[0]): Promise<void> {
    this.log("emailVerification", options);
  }

  public async sendPasswordReset(options: Parameters<EmailGateway["sendPasswordReset"]>[0]): Promise<void> {
    this.log("passwordReset", options);
  }

  public async sendEventAnnouncement(options: Parameters<EmailGateway["sendEventAnnouncement"]>[0]): Promise<void> {
    this.log("eventAnnouncement", options);
  }

  public async sendRefundConfirmation(options: Parameters<EmailGateway["sendRefundConfirmation"]>[0]): Promise<void> {
    this.log("refundConfirmation", options);
  }
}
