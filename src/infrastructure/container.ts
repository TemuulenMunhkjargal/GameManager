import { CreateEventUseCase } from "../application/events/create-event";
import { CheckInRegistrationUseCase } from "../application/registrations/check-in-registration";
import { BulkCheckInUseCase } from "../application/registrations/bulk-check-in";
import { CancelRegistrationUseCase } from "../application/registrations/cancel-registration";
import { WithdrawFromWaitlistUseCase } from "../application/registrations/withdraw-from-waitlist";
import { RegisterForEventUseCase } from "../application/registrations/register-for-event";
import { RecordManualPaymentUseCase } from "../application/payments/record-manual-payment";
import { RefundPaymentUseCase } from "../application/payments/refund-payment";
import { UpdateEventUseCase } from "../application/events/update-event";
import { SendEventAnnouncementUseCase } from "../application/communications/send-event-announcement";
import { AnnouncementDeliveryService } from "../application/communications/announcement-delivery-service";
import { SendDueAnnouncementsUseCase } from "../application/communications/send-due-announcements";
import { PublishEventUseCase, CancelEventUseCase } from "../application/events/event-lifecycle";
import { ArchiveEventUseCase, MaintainEventArchiveUseCase } from "../application/events/event-archive";
import { CreateMemberProfileUseCase } from "../application/members/create-member-profile";
import {
  AwardLeaguePointsUseCase,
  CompleteLeagueUseCase,
  CreateLeagueUseCase,
  DeleteLeagueAdjustmentUseCase,
  EnrollLeagueParticipantUseCase,
  RecordFlexibleLeagueMatchUseCase,
  RecordLeagueMatchUseCase,
  RecordLeaguePodUseCase,
  RemoveLeagueParticipantUseCase,
  StartLeagueUseCase,
  VoidLeagueMatchUseCase,
} from "../application/leagues/create-league";
import { DrizzleAnnouncementRepository } from "./db/repositories/announcement-repository";
import { DrizzleLeagueRepository } from "./db/repositories/league-repository";
import { UpdateOrganizationProfileUseCase } from "../application/organizations/update-organization-profile";
import { CreateGameSystemUseCase } from "../application/game-systems/create-game-system";
import { ArchiveGameSystemUseCase, RestoreGameSystemUseCase } from "../application/game-systems/archive-game-system";
import { db } from "./db/client";
import { DrizzleEventRepository } from "./db/repositories/event-repository";
import { DrizzleRegistrationRepository } from "./db/repositories/registration-repository";
import { DrizzleWaitlistRepository } from "./db/repositories/waitlist-repository";
import { DrizzleMemberRepository } from "./db/repositories/member-repository";
import { DrizzlePaymentRepository } from "./db/repositories/payment-repository";
import { DrizzleGameSystemQueries } from "./db/repositories/game-system-queries";
import { DrizzleOrganizationRepository } from "./db/repositories/organization-repository";
import { DrizzleOrganizationSettingsQueries } from "./db/repositories/organization-settings-queries";
import { DrizzleDashboardQueries } from "./db/repositories/dashboard-queries";
import { DrizzleTableRepository } from "./db/repositories/table-repository";
import { WebhookDiscordGateway } from "./discord/webhook-gateway";
import { createId } from "../lib/id";

export const DEFAULT_ORGANIZATION_ID = "org_mana_vault";

const eventRepository = new DrizzleEventRepository(db);
const registrationRepository = new DrizzleRegistrationRepository(db);
const waitlistRepository = new DrizzleWaitlistRepository(db);
const memberRepository = new DrizzleMemberRepository(db);
const paymentRepository = new DrizzlePaymentRepository(db);
const organizationRepository = new DrizzleOrganizationRepository(db);
const gameSystemCatalog = new DrizzleGameSystemQueries(db);
const discordGateway = new WebhookDiscordGateway();
const announcementRepository = new DrizzleAnnouncementRepository(db);
const announcementDeliveryService = new AnnouncementDeliveryService(
  eventRepository,
  organizationRepository,
  discordGateway,
);
const leagueRepository = new DrizzleLeagueRepository(db, createId);
const tableRepository = new DrizzleTableRepository(db);

export const container = {
  events: eventRepository,
  registrations: registrationRepository,
  waitlist: waitlistRepository,
  members: memberRepository,
  payments: paymentRepository,
  announcements: announcementRepository,
  leagues: leagueRepository,
  tables: tableRepository,
  gameSystems: gameSystemCatalog,
  settings: new DrizzleOrganizationSettingsQueries(db),
  discord: discordGateway,
  dashboard: new DrizzleDashboardQueries(db, eventRepository),
  useCases: {
    registerForEvent: new RegisterForEventUseCase(eventRepository, memberRepository, registrationRepository,
      waitlistRepository, () => createId("reg"), () => createId("wait")),
    createEvent: new CreateEventUseCase(
      eventRepository,
      organizationRepository,
      discordGateway,
      () => createId("event"),
    ),
    checkInRegistration: new CheckInRegistrationUseCase(registrationRepository),
    bulkCheckIn: new BulkCheckInUseCase(registrationRepository),
    cancelRegistration: new CancelRegistrationUseCase(
      eventRepository,
      registrationRepository,
      waitlistRepository,
      () => createId("reg"),
    ),
    withdrawFromWaitlist: new WithdrawFromWaitlistUseCase(waitlistRepository),
    recordManualPayment: new RecordManualPaymentUseCase(
      eventRepository,
      registrationRepository,
      paymentRepository,
      () => createId("pay"),
    ),
    refundPayment: new RefundPaymentUseCase(paymentRepository),
    updateEvent: new UpdateEventUseCase(eventRepository),
    publishEvent: new PublishEventUseCase(eventRepository),
    cancelEvent: new CancelEventUseCase(eventRepository),
    archiveEvent: new ArchiveEventUseCase(eventRepository),
    maintainEventArchive: new MaintainEventArchiveUseCase(eventRepository, eventRepository),
    createMemberProfile: new CreateMemberProfileUseCase(memberRepository, () => createId("member")),
    createLeague: new CreateLeagueUseCase(leagueRepository, () => createId("league")),
    enrollLeagueParticipant: new EnrollLeagueParticipantUseCase(leagueRepository, leagueRepository, memberRepository, () => createId("league_participant")),
    removeLeagueParticipant: new RemoveLeagueParticipantUseCase(leagueRepository, leagueRepository),
    startLeague: new StartLeagueUseCase(leagueRepository, leagueRepository),
    completeLeague: new CompleteLeagueUseCase(leagueRepository, leagueRepository),
    recordLeagueMatch: new RecordLeagueMatchUseCase(leagueRepository, leagueRepository),
    recordFlexibleLeagueMatch: new RecordFlexibleLeagueMatchUseCase(leagueRepository, leagueRepository),
    recordLeaguePod: new RecordLeaguePodUseCase(leagueRepository, leagueRepository),
    awardLeaguePoints: new AwardLeaguePointsUseCase(leagueRepository, leagueRepository, () => createId("league_adjustment")),
    deleteLeagueAdjustment: new DeleteLeagueAdjustmentUseCase(leagueRepository, leagueRepository),
    voidLeagueMatch: new VoidLeagueMatchUseCase(leagueRepository, leagueRepository),
    sendEventAnnouncement: new SendEventAnnouncementUseCase(
      eventRepository,
      announcementRepository,
      announcementDeliveryService,
      () => createId("ann"),
    ),
    sendDueAnnouncements: new SendDueAnnouncementsUseCase(
      announcementRepository,
      announcementDeliveryService,
    ),
    updateOrganizationProfile: new UpdateOrganizationProfileUseCase(organizationRepository),
    createGameSystem: new CreateGameSystemUseCase(gameSystemCatalog, () => createId("game")),
    archiveGameSystem: new ArchiveGameSystemUseCase(gameSystemCatalog),
    restoreGameSystem: new RestoreGameSystemUseCase(gameSystemCatalog),
  },
};
