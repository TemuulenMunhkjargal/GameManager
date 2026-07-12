import { Resend } from "resend";
import type { EmailGateway } from "../../application/shared/email-gateway";
import {
  emailVerificationEmail,
  eventAnnouncementEmail,
  passwordResetEmail,
  paymentConfirmationEmail,
  refundConfirmationEmail,
  rsvpConfirmationEmail,
  teamInviteEmail,
  waitlistConfirmationEmail,
  waitlistPromotionEmail,
} from "./templates";

export class ResendEmailGateway implements EmailGateway {
  private readonly client: Resend;
  private readonly from: string;

  public constructor(apiKey: string, from: string) {
    this.client = new Resend(apiKey);
    this.from = from;
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    const { error } = await this.client.emails.send({ from: this.from, to, subject, html });

    if (error) {
      // Log but don't throw — email failure should never break the primary
      // user action (registration, payment, etc.) that triggered it.
      console.error("[ResendEmailGateway] send failed:", error);
    }
  }

  public async sendTeamInvite(options: {
    to: string;
    organizationName: string;
    role: string;
    signUpUrl: string;
  }): Promise<void> {
    const { subject, html } = teamInviteEmail(options);
    await this.send(options.to, subject, html);
  }

  public async sendRsvpConfirmation(options: {
    to: string;
    attendeeName: string;
    eventTitle: string;
    eventDate: string;
    venueName: string;
    entryFeeInCents: number;
  }): Promise<void> {
    const { subject, html } = rsvpConfirmationEmail(options);
    await this.send(options.to, subject, html);
  }

  public async sendWaitlistConfirmation(options: {
    to: string;
    attendeeName: string;
    eventTitle: string;
    eventDate: string;
    position: number;
  }): Promise<void> {
    const { subject, html } = waitlistConfirmationEmail(options);
    await this.send(options.to, subject, html);
  }

  public async sendWaitlistPromotion(options: {
    to: string;
    attendeeName: string;
    eventTitle: string;
    eventDate: string;
    venueName: string;
    entryFeeInCents: number;
  }): Promise<void> {
    const { subject, html } = waitlistPromotionEmail(options);
    await this.send(options.to, subject, html);
  }

  public async sendPaymentConfirmation(options: {
    to: string;
    attendeeName: string;
    eventTitle: string;
    eventDate: string;
    amountInCents: number;
  }): Promise<void> {
    const { subject, html } = paymentConfirmationEmail(options);
    await this.send(options.to, subject, html);
  }

  public async sendEmailVerification(options: {
    to: string;
    name: string;
    verificationUrl: string;
  }): Promise<void> {
    const { subject, html } = emailVerificationEmail(options);
    await this.send(options.to, subject, html);
  }

  public async sendPasswordReset(options: {
    to: string;
    name: string;
    resetUrl: string;
  }): Promise<void> {
    const { subject, html } = passwordResetEmail(options);
    await this.send(options.to, subject, html);
  }

  public async sendEventAnnouncement(options: {
    to: string;
    recipientName: string;
    eventTitle: string;
    subject: string;
    body: string;
  }): Promise<void> {
    const { subject, html } = eventAnnouncementEmail(options);
    await this.send(options.to, subject, html);
  }

  public async sendRefundConfirmation(options: {
    to: string;
    attendeeName: string;
    eventTitle: string;
    amountInCents: number;
  }): Promise<void> {
    const { subject, html } = refundConfirmationEmail(options);
    await this.send(options.to, subject, html);
  }
}
