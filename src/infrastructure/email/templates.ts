const base = (content: string, previewText: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CritTable</title>
</head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${previewText}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#2d5016;border-radius:8px;width:36px;height:36px;text-align:center;vertical-align:middle;">
                    <span style="color:#fff;font-weight:900;font-size:16px;line-height:36px;">CT</span>
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <span style="font-weight:800;font-size:17px;color:#171717;">CritTable</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#fff;border-radius:12px;border:1px solid #e8e0d0;padding:36px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:20px;text-align:center;color:#9c8f7a;font-size:13px;">
              CritTable &mdash; event operations for local game stores
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const heading = (text: string) =>
  `<h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#171717;">${text}</h1>`;

const para = (text: string) =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3a33;">${text}</p>`;

const detail = (label: string, value: string) => `
  <tr>
    <td style="padding:8px 0;color:#9c8f7a;font-size:13px;font-weight:700;white-space:nowrap;padding-right:16px;">${label}</td>
    <td style="padding:8px 0;color:#171717;font-size:14px;">${value}</td>
  </tr>`;

const detailTable = (rows: string) =>
  `<table cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%;">${rows}</table>`;

const cta = (text: string, href: string) =>
  `<a href="${href}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#2d5016;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">${text}</a>`;

const divider = () =>
  `<hr style="margin:24px 0;border:none;border-top:1px solid #e8e0d0;" />`;

function formatMoney(cents: number): string {
  return cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`;
}

export function teamInviteEmail(options: {
  organizationName: string;
  role: string;
  signUpUrl: string;
}): { subject: string; html: string } {
  const roleFriendly = options.role.replace("_", " ");

  return {
    subject: `You've been invited to ${options.organizationName} on CritTable`,
    html: base(
      [
        heading(`You're invited to join ${options.organizationName}`),
        para(
          `You've been given the <strong>${roleFriendly}</strong> role on CritTable, the event operations platform for ${options.organizationName}.`,
        ),
        para("Create your account to accept the invitation and get access to the dashboard."),
        cta("Create account", options.signUpUrl),
        divider(),
        para(
          `If you weren't expecting this invite, you can safely ignore this email. The invitation won't do anything unless you click the link above.`,
        ),
      ].join(""),
      `You've been invited to join ${options.organizationName} as ${roleFriendly}.`,
    ),
  };
}

export function rsvpConfirmationEmail(options: {
  attendeeName: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  entryFeeInCents: number;
}): { subject: string; html: string } {
  const payAtDoor = options.entryFeeInCents > 0;

  return {
    subject: `You're registered for ${options.eventTitle}`,
    html: base(
      [
        heading(`See you there, ${options.attendeeName}!`),
        para(`Your spot is reserved for <strong>${options.eventTitle}</strong>.`),
        detailTable(
          [
            detail("Event", options.eventTitle),
            detail("Date", options.eventDate),
            detail("Venue", options.venueName),
            detail("Entry fee", formatMoney(options.entryFeeInCents)),
          ].join(""),
        ),
        payAtDoor
          ? para(
              `<strong>Pay at the door:</strong> your entry fee of ${formatMoney(options.entryFeeInCents)} is due when you arrive. Staff will mark you as paid when you check in.`,
            )
          : "",
        para("We'll see you at the table!"),
      ].join(""),
      `Your spot is confirmed for ${options.eventTitle} on ${options.eventDate}.`,
    ),
  };
}

export function waitlistConfirmationEmail(options: {
  attendeeName: string;
  eventTitle: string;
  eventDate: string;
  position: number;
}): { subject: string; html: string } {
  return {
    subject: `You're on the waitlist for ${options.eventTitle}`,
    html: base(
      [
        heading(`You're on the waitlist`),
        para(
          `Hi ${options.attendeeName} — <strong>${options.eventTitle}</strong> is currently full, but you're <strong>#${options.position}</strong> on the waitlist.`,
        ),
        detailTable(
          [
            detail("Event", options.eventTitle),
            detail("Date", options.eventDate),
            detail("Waitlist position", `#${options.position}`),
          ].join(""),
        ),
        para(
          "If a seat opens up, we'll move you to confirmed and send you another email automatically. No action needed from you right now.",
        ),
      ].join(""),
      `You're #${options.position} on the waitlist for ${options.eventTitle}.`,
    ),
  };
}

export function waitlistPromotionEmail(options: {
  attendeeName: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  entryFeeInCents: number;
}): { subject: string; html: string } {
  const payAtDoor = options.entryFeeInCents > 0;

  return {
    subject: `A seat opened up — you're in for ${options.eventTitle}!`,
    html: base(
      [
        heading(`Good news — you're in!`),
        para(
          `Hi ${options.attendeeName} — a seat opened up for <strong>${options.eventTitle}</strong> and you've been moved from the waitlist to confirmed.`,
        ),
        detailTable(
          [
            detail("Event", options.eventTitle),
            detail("Date", options.eventDate),
            detail("Venue", options.venueName),
            detail("Entry fee", formatMoney(options.entryFeeInCents)),
          ].join(""),
        ),
        payAtDoor
          ? para(
              `<strong>Pay at the door:</strong> your entry fee of ${formatMoney(options.entryFeeInCents)} is due when you arrive.`,
            )
          : "",
        para("See you there!"),
      ].join(""),
      `A seat opened up — you're confirmed for ${options.eventTitle}!`,
    ),
  };
}

export function paymentConfirmationEmail(options: {
  attendeeName: string;
  eventTitle: string;
  eventDate: string;
  amountInCents: number;
}): { subject: string; html: string } {
  return {
    subject: `Payment confirmed for ${options.eventTitle}`,
    html: base(
      [
        heading("Payment received"),
        para(
          `Hi ${options.attendeeName} — your entry fee for <strong>${options.eventTitle}</strong> has been recorded. You're all set!`,
        ),
        detailTable(
          [
            detail("Event", options.eventTitle),
            detail("Date", options.eventDate),
            detail("Amount paid", formatMoney(options.amountInCents)),
            detail("Method", "In-store / at the door"),
          ].join(""),
        ),
        para("See you at the table!"),
      ].join(""),
      `Your ${formatMoney(options.amountInCents)} entry fee for ${options.eventTitle} has been confirmed.`,
    ),
  };
}

export function emailVerificationEmail(options: {
  name: string;
  verificationUrl: string;
}): { subject: string; html: string } {
  return {
    subject: "Verify your CritTable email address",
    html: base(
      [
        heading(`Verify your email, ${options.name}`),
        para("Confirm this is your email address to finish setting up your CritTable account."),
        cta("Verify email", options.verificationUrl),
        divider(),
        para("If you didn't create a CritTable account, you can safely ignore this email."),
      ].join(""),
      "Confirm your email address to finish setting up your CritTable account.",
    ),
  };
}

export function passwordResetEmail(options: {
  name: string;
  resetUrl: string;
}): { subject: string; html: string } {
  return {
    subject: "Reset your CritTable password",
    html: base(
      [
        heading(`Reset your password, ${options.name}`),
        para("We received a request to reset your CritTable password. Click below to choose a new one."),
        cta("Reset password", options.resetUrl),
        divider(),
        para(
          "This link expires soon. If you didn't request a password reset, you can safely ignore this email — your password won't change.",
        ),
      ].join(""),
      "Click the link to reset your CritTable password.",
    ),
  };
}


export function eventAnnouncementEmail(options: {
  recipientName: string;
  eventTitle: string;
  subject: string;
  body: string;
}): { subject: string; html: string } {
  return {
    subject: options.subject,
    html: base(
      [
        heading(options.subject),
        para(`Hi ${options.recipientName},`),
        ...options.body.split("\n\n").map((paragraph) => para(paragraph.trim())),
        divider(),
        para(
          `This message was sent to you because you are registered for <strong>${options.eventTitle}</strong>.`,
        ),
      ].join(""),
      options.body.slice(0, 100).trim(),
    ),
  };
}

export function refundConfirmationEmail(options: {
  attendeeName: string;
  eventTitle: string;
  amountInCents: number;
}): { subject: string; html: string } {
  return {
    subject: `Refund processed for ${options.eventTitle}`,
    html: base(
      [
        heading("Refund processed"),
        para(
          `Hi ${options.attendeeName} — your entry fee for <strong>${options.eventTitle}</strong> has been refunded.`,
        ),
        detailTable(
          [
            detail("Event", options.eventTitle),
            detail("Amount refunded", formatMoney(options.amountInCents)),
            detail("Method", "In-store / original payment method"),
          ].join(""),
        ),
        para("If you have any questions about this refund, reach out to the store directly."),
      ].join(""),
      `Your ${formatMoney(options.amountInCents)} refund for ${options.eventTitle} has been processed.`,
    ),
  };
}
