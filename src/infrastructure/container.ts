import { CreateEventUseCase } from "../application/events/create-event";
import { RegisterForEventUseCase } from "../application/registrations/register-for-event";
import { RegisterGuestForEventUseCase } from "../application/registrations/register-guest-for-event";
import { CheckInRegistrationUseCase } from "../application/registrations/check-in-registration";
import { CancelRegistrationUseCase } from "../application/registrations/cancel-registration";
import { WithdrawFromWaitlistUseCase } from "../application/registrations/withdraw-from-waitlist";
import type { AuthenticatedUser } from "../application/organizations/ports";
import type { Membership } from "../domain/organizations/membership";
import { db } from "./db/client";
import { DrizzleEventRepository } from "./db/repositories/event-repository";
import { DrizzleRegistrationRepository } from "./db/repositories/registration-repository";
import { DrizzleWaitlistRepository } from "./db/repositories/waitlist-repository";
import { DrizzleMemberRepository } from "./db/repositories/member-repository";
import { DrizzleMembershipRepository } from "./db/repositories/membership-repository";
import { DrizzleGameSystemQueries } from "./db/repositories/game-system-queries";
import { DrizzleOrganizationSettingsQueries } from "./db/repositories/organization-settings-queries";
import { DrizzleDashboardQueries } from "./db/repositories/dashboard-queries";
import { BetterAuthCurrentUserProvider } from "./auth/current-user-provider";

export const DEFAULT_ORGANIZATION_ID = "org_mana_vault";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

const eventRepository = new DrizzleEventRepository(db);
const registrationRepository = new DrizzleRegistrationRepository(db);
const waitlistRepository = new DrizzleWaitlistRepository(db);
const memberRepository = new DrizzleMemberRepository(db);
const membershipRepository = new DrizzleMembershipRepository(db);
const currentUserProvider = new BetterAuthCurrentUserProvider();

const registerForEventUseCase = new RegisterForEventUseCase(
  eventRepository,
  registrationRepository,
  waitlistRepository,
  () => createId("reg"),
  () => createId("wait"),
);

export const container = {
  events: eventRepository,
  registrations: registrationRepository,
  waitlist: waitlistRepository,
  members: memberRepository,
  memberships: membershipRepository,
  currentUser: currentUserProvider,
  gameSystems: new DrizzleGameSystemQueries(db),
  settings: new DrizzleOrganizationSettingsQueries(db),
  dashboard: new DrizzleDashboardQueries(db, eventRepository),
  useCases: {
    createEvent: new CreateEventUseCase(eventRepository, () => createId("event")),
    registerGuestForEvent: new RegisterGuestForEventUseCase(
      memberRepository,
      registerForEventUseCase,
      () => createId("member"),
    ),
    checkInRegistration: new CheckInRegistrationUseCase(registrationRepository),
    cancelRegistration: new CancelRegistrationUseCase(
      eventRepository,
      registrationRepository,
      waitlistRepository,
      () => createId("reg"),
    ),
    withdrawFromWaitlist: new WithdrawFromWaitlistUseCase(waitlistRepository),
  },
};

/**
 * Resolves "who is making this request" for a given organization. This is
 * pure composition (current session + membership lookup), not a business
 * rule, so it lives here rather than as its own use case — route handlers
 * call it once, then pass the resulting membership into whichever use case
 * needs to authorize the action.
 */
export async function resolveActor(
  organizationId: string,
): Promise<{ user: AuthenticatedUser; membership: Membership | null } | null> {
  const user = await container.currentUser.getCurrentUser();

  if (!user) {
    return null;
  }

  const membership = await container.memberships.findForUserAndOrganization(
    user.id,
    organizationId,
  );

  return { user, membership };
}
