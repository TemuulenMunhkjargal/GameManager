import type { EmailGateway } from "../../application/shared/email-gateway";
import { ResendEmailGateway } from "./resend-gateway";
import { ConsoleEmailGateway } from "./console-gateway";

const RESEND_FROM = process.env.RESEND_FROM ?? "CritTable <noreply@example.com>";

export const emailGateway: EmailGateway = process.env.RESEND_API_KEY
  ? new ResendEmailGateway(process.env.RESEND_API_KEY, RESEND_FROM)
  : new ConsoleEmailGateway();
