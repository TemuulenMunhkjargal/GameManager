import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { AcceptPendingInvitationsUseCase } from "../../application/organizations/accept-pending-invitations";
import { db } from "../db/client";
import { DrizzleMembershipRepository } from "../db/repositories/membership-repository";
import { emailGateway } from "../email/gateway-selection";
import * as schema from "../db/schema";

const acceptPendingInvitations = new AcceptPendingInvitationsUseCase(
  new DrizzleMembershipRepository(db),
);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await emailGateway.sendPasswordReset({
        to: user.email,
        name: user.name,
        resetUrl: url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await emailGateway.sendEmailVerification({
        to: user.email,
        name: user.name,
        verificationUrl: url,
      });
    },
  },
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
      enabled: !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await acceptPendingInvitations.execute(user.email, user.id);
        },
      },
    },
  },
});

export type Auth = typeof auth;

