import { CreateEventUseCase } from "../application/events/create-event";
import { RegisterForEventUseCase } from "../application/registrations/register-for-event";
import { RegisterGuestForEventUseCase } from "../application/registrations/register-guest-for-event";
import { CheckInRegistrationUseCase } from "../application/registrations/check-in-registration";
import { BulkCheckInUseCase } from "../application/registrations/bulk-check-in";
import { CancelRegistrationUseCase } from "../application/registrations/cancel-registration";
import { WithdrawFromWaitlistUseCase } from "../application/registrations/withdraw-from-waitlist";
import { RecordManualPaymentUseCase } from "../application/payments/record-manual-payment";
import { RefundPaymentUseCase } from "../application/payments/refund-payment";
import { UpdateEventUseCase } from "../application/events/update-event";
import { InviteTeammateUseCase } from "../application/organizations/invite-teammate";
import { UpdateTeammateRoleUseCase } from "../application/organizations/update-teammate-role";
import { RemoveTeammateUseCase } from "../application/organizations/remove-teammate";
import { ReinstateTeammateUseCase } from "../application/organizations/reinstate-teammate";
import { SendEventAnnouncementUseCase } from "../application/communications/send-event-announcement";
import { AnnouncementDeliveryService } from "../application/communications/announcement-delivery-service";
import { SendDueAnnouncementsUseCase } from "../application/communications/send-due-announcements";
import { PublishEventUseCase, CancelEventUseCase } from "../application/events/event-lifecycle";
import { CreateMemberProfileUseCase } from "../application/members/create-member-profile";
import { CreateVenueUseCase, CreateRoomUseCase } from "../application/venues/create-venue";
import { ArchiveVenueUseCase, RestoreVenueUseCase } from "../application/venues/archive-venue";
import { CreateLeagueUseCase, RecordLeagueResultUseCase, StartLeagueUseCase } from "../application/leagues/create-league";
import { DrizzleAnnouncementRepository } from "./db/repositories/announcement-repository";
import { DrizzleVenueRepository, DrizzleRoomRepository } from "./db/repositories/venue-repository";
import { DrizzleLeagueRepository } from "./db/repositories/league-repository";
import { UpdateOrganizationProfileUseCase } from "../application/organizations/update-organization-profile";
import { CreateGameSystemUseCase } from "../application/game-systems/create-game-system";
import { ArchiveGameSystemUseCase, RestoreGameSystemUseCase } from "../application/game-systems/archive-game-system";
import type { AuthenticatedUser } from "../application/organizations/ports";
import type { Membership } from "../domain/organizations/membership";
import { db } from "./db/client";
import { DrizzleEventRepository } from "./db/repositories/event-repository";
import { DrizzleRegistrationRepository } from "./db/repositories/registration-repository";
import { DrizzleWaitlistRepository } from "./db/repositories/waitlist-repository";
import { DrizzleMemberRepository } from "./db/repositories/member-repository";
import { DrizzleMembershipRepository } from "./db/repositories/membership-repository";
import { DrizzleTeamQueries } from "./db/repositories/team-queries";
import { DrizzlePaymentRepository } from "./db/repositories/payment-repository";
import { DrizzleGameSystemQueries } from "./db/repositories/game-system-queries";
import { DrizzleOrganizationRepository } from "./db/repositories/organization-repository";
import { DrizzleOrganizationSettingsQueries } from "./db/repositories/organization-settings-queries";
import { DrizzleDashboardQueries } from "./db/repositories/dashboard-queries";
import { BetterAuthCurrentUserProvider } from "./auth/current-user-provider";
import { emailGateway } from "./email/gateway-selection";
import { WebhookDiscordGateway } from "./discord/webhook-gateway";

export const DEFAULT_ORGANIZATION_ID = "org_mana_vault";
export const APP_BASE_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

const eventRepository = new DrizzleEventRepository(db);
const registrationRepository = new DrizzleRegistrationRepository(db);
const waitlistRepository = new DrizzleWaitlistRepository(db);
const memberRepository = new DrizzleMemberRepository(db);
const membershipRepository = new DrizzleMembershipRepository(db);
const paymentRepository = new DrizzlePaymentRepository(db);
const organizationRepository = new DrizzleOrganizationRepository(db);
const gameSystemCatalog = new DrizzleGameSystemQueries(db);
const discordGateway = new WebhookDiscordGateway();
const announcementRepository = new DrizzleAnnouncementRepository(db);
const announcementDeliveryService = new AnnouncementDeliveryService(
  eventRepository,
  organizationRepository,
  registrationRepository,
  emailGateway,
  discordGateway,
);
const venueRepository = new DrizzleVenueRepository(db);
const roomRepository = new DrizzleRoomRepository(db);
const leagueRepository = new DrizzleLeagueRepository(db);
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
  team: new DrizzleTeamQueries(db),
  payments: paymentRepository,
  announcements: announcementRepository,
  venues: venueRepository,
  leagues: leagueRepository,
  currentUser: currentUserProvider,
  gameSystems: gameSystemCatalog,
  settings: new DrizzleOrganizationSettingsQueries(db),
  dashboard: new DrizzleDashboardQueries(db, eventRepository),
  useCases: {
    createEvent: new CreateEventUseCase(
      eventRepository,
      organizationRepository,
      venueRepository,
      roomRepository,
      discordGateway,
      () => createId("event"),
    ),
    registerGuestForEvent: new RegisterGuestForEventUseCase(
      eventRepository,
      memberRepository,
      registerForEventUseCase,
      emailGateway,
      () => createId("member"),
    ),
    checkInRegistration: new CheckInRegistrationUseCase(registrationRepository),
    bulkCheckIn: new BulkCheckInUseCase(registrationRepository),
    cancelRegistration: new CancelRegistrationUseCase(
      eventRepository,
      registrationRepository,
      waitlistRepository,
      memberRepository,
      emailGateway,
      () => createId("reg"),
    ),
    withdrawFromWaitlist: new WithdrawFromWaitlistUseCase(waitlistRepository),
    recordManualPayment: new RecordManualPaymentUseCase(
      eventRepository,
      registrationRepository,
      memberRepository,
      paymentRepository,
      emailGateway,
      () => createId("pay"),
    ),
    refundPayment: new RefundPaymentUseCase(
      eventRepository,
      registrationRepository,
      memberRepository,
      paymentRepository,
      emailGateway,
    ),
    updateEvent: new UpdateEventUseCase(eventRepository, venueRepository, roomRepository),
    inviteTeammate: new InviteTeammateUseCase(
      membershipRepository,
      emailGateway,
      () => createId("membership"),
    ),
    updateTeammateRole: new UpdateTeammateRoleUseCase(membershipRepository),
    removeTeammate: new RemoveTeammateUseCase(membershipRepository),
    reinstateTeammate: new ReinstateTeammateUseCase(membershipRepository),
    publishEvent: new PublishEventUseCase(eventRepository),
    cancelEvent: new CancelEventUseCase(eventRepository),
    createMemberProfile: new CreateMemberProfileUseCase(memberRepository, () => createId("member")),
    createVenue: new CreateVenueUseCase(venueRepository, () => createId("venue")),
    archiveVenue: new ArchiveVenueUseCase(venueRepository),
    restoreVenue: new RestoreVenueUseCase(venueRepository),
    createRoom: new CreateRoomUseCase(venueRepository, roomRepository, () => createId("room")),
    createLeague: new CreateLeagueUseCase(leagueRepository, () => createId("league")),
    startLeague: new StartLeagueUseCase(leagueRepository),
    recordLeagueResult: new RecordLeagueResultUseCase(leagueRepository, leagueRepository, () => createId("standing")),
    sendEventAnnouncement: new SendEventAnnouncementUseCase(
      eventRepository,
      announcementRepository,
      announcementDeliveryService,
      () => createId("ann"),
    ),
    sendDueAnnouncements: new SendDueAnnouncementsUseCase(
      announcementRepository,
      announcementDeliveryService,
      APP_BASE_URL,
    ),
    updateOrganizationProfile: new UpdateOrganizationProfileUseCase(organizationRepository),
    createGameSystem: new CreateGameSystemUseCase(gameSystemCatalog, () => createId("game")),
    archiveGameSystem: new ArchiveGameSystemUseCase(gameSystemCatalog),
    restoreGameSystem: new RestoreGameSystemUseCase(gameSystemCatalog),
  },
};

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
