/**
 * The application layer's only view of email sending. Use cases call this
 * interface; the Resend adapter in src/infrastructure/email/ implements it.
 * Swap the adapter to change providers without touching any use case.
 */
export interface EmailGateway {
  sendTeamInvite(options: {
    to: string;
    organizationName: string;
    role: string;
    signUpUrl: string;
  }): Promise<void>;

  sendRsvpConfirmation(options: {
    to: string;
    attendeeName: string;
    eventTitle: string;
    eventDate: string;
    venueName: string;
    entryFeeInCents: number;
  }): Promise<void>;

  sendWaitlistConfirmation(options: {
    to: string;
    attendeeName: string;
    eventTitle: string;
    eventDate: string;
    position: number;
  }): Promise<void>;

  sendWaitlistPromotion(options: {
    to: string;
    attendeeName: string;
    eventTitle: string;
    eventDate: string;
    venueName: string;
    entryFeeInCents: number;
  }): Promise<void>;

  sendPaymentConfirmation(options: {
    to: string;
    attendeeName: string;
    eventTitle: string;
    eventDate: string;
    amountInCents: number;
  }): Promise<void>;

  sendEmailVerification(options: {
    to: string;
    name: string;
    verificationUrl: string;
  }): Promise<void>;

  sendPasswordReset(options: {
    to: string;
    name: string;
    resetUrl: string;
  }): Promise<void>;

  sendEventAnnouncement(options: {
    to: string;
    recipientName: string;
    eventTitle: string;
    subject: string;
    body: string;
  }): Promise<void>;

  sendRefundConfirmation(options: {
    to: string;
    attendeeName: string;
    eventTitle: string;
    amountInCents: number;
  }): Promise<void>;
}
