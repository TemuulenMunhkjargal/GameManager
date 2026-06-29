import { eq } from "drizzle-orm";
import "./load-env";
import { db } from "./client";
import { auth } from "../auth/auth";
import {
  authAccounts,
  authSessions,
  authUsers,
  events,
  gameSystems,
  memberProfiles,
  memberships,
  organizations,
  registrations,
  waitlistEntries,
} from "./schema";

const ORG_ID = "org_mana_vault";
const STAFF_EMAIL = "owner@manavault.example";
const STAFF_PASSWORD = "crittable-demo";

function nextDateAt(dayOfWeek: number, hour: number, minute: number): Date {
  const date = new Date();
  const distance = (dayOfWeek + 7 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + distance);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function seed() {
  console.log("Seeding CritTable demo data...");

  await db.delete(waitlistEntries);
  await db.delete(registrations);
  await db.delete(events);
  await db.delete(gameSystems);
  await db.delete(memberProfiles);
  await db.delete(memberships);
  await db.delete(organizations);

  const [existingStaffUser] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, STAFF_EMAIL))
    .limit(1);

  if (existingStaffUser) {
    await db.delete(authAccounts).where(eq(authAccounts.userId, existingStaffUser.id));
    await db.delete(authSessions).where(eq(authSessions.userId, existingStaffUser.id));
    await db.delete(authUsers).where(eq(authUsers.id, existingStaffUser.id));
  }

  await db.insert(organizations).values({
    id: ORG_ID,
    name: "Mana Vault Games",
    publicSlug: "mana-vault-games",
    timezone: "America/Chicago",
    contactEmail: "events@manavault.example",
    defaultVenueName: "Mana Vault Games",
    publicPageEnabled: true,
    waitlistsEnabledByDefault: true,
  });

  await db.insert(memberProfiles).values([
    {
      id: "member_mara",
      organizationId: ORG_ID,
      displayName: "Mara Chen",
      email: "mara@example.com",
      phone: "(312) 555-0198",
      favoriteGameSystem: "Magic: The Gathering",
      status: "active",
      joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 42),
    },
    {
      id: "member_jon",
      organizationId: ORG_ID,
      displayName: "Jon Bell",
      email: "jon@example.com",
      favoriteGameSystem: "Dungeons & Dragons",
      status: "active",
      joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18),
    },
    {
      id: "member_asha",
      organizationId: ORG_ID,
      displayName: "Asha Patel",
      email: "asha@example.com",
      phone: "(773) 555-0133",
      favoriteGameSystem: "Pokemon TCG",
      status: "active",
      joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    },
  ]);

  await db.insert(gameSystems).values([
    {
      id: "game_magic",
      organizationId: ORG_ID,
      name: "Magic: The Gathering",
      slug: "magic-the-gathering",
      type: "tcg",
      defaultCapacity: 24,
      notes: "Drafts, Commander pods, prereleases, and casual leagues.",
    },
    {
      id: "game_dnd",
      organizationId: ORG_ID,
      name: "Dungeons & Dragons",
      slug: "dungeons-and-dragons",
      type: "ttrpg",
      defaultCapacity: 12,
      notes: "One-shots, campaign nights, learn-to-play tables, and GM rotations.",
    },
    {
      id: "game_pokemon",
      organizationId: ORG_ID,
      name: "Pokemon TCG",
      slug: "pokemon-tcg",
      type: "tcg",
      defaultCapacity: 32,
      notes: "League play, trade nights, learn-to-play days, and release events.",
    },
    {
      id: "game_warhammer",
      organizationId: ORG_ID,
      name: "Warhammer",
      slug: "warhammer",
      type: "miniatures",
      defaultCapacity: 8,
      notes: "Escalation leagues, paint nights, demo tables, and tournament days.",
    },
  ]);

  await db.insert(events).values([
    {
      id: "event_friday_magic",
      organizationId: ORG_ID,
      title: "Friday Night Draft",
      description:
        "Three rounds of booster draft with casual prizes and open tables after round one.",
      status: "published",
      visibility: "public",
      startsAt: nextDateAt(5, 19, 0),
      endsAt: nextDateAt(5, 22, 30),
      capacity: 24,
      waitlistEnabled: true,
      entryFeeInCents: 1500,
      gameSystemLabel: "Magic: The Gathering",
      venueName: "Mana Vault Games",
      roomName: "Main Play Room",
    },
    {
      id: "event_campaign_night",
      organizationId: ORG_ID,
      title: "D&D One-Shot Night",
      description:
        "Beginner-friendly tables with pre-generated characters and a rotating GM pool.",
      status: "published",
      visibility: "public",
      startsAt: nextDateAt(2, 18, 30),
      endsAt: nextDateAt(2, 21, 30),
      capacity: 12,
      waitlistEnabled: true,
      entryFeeInCents: 500,
      gameSystemLabel: "Dungeons & Dragons",
      venueName: "Mana Vault Games",
      roomName: "Adventure Room",
    },
  ]);

  await db.insert(registrations).values([
    {
      id: "reg_1",
      eventId: "event_friday_magic",
      memberProfileId: "member_mara",
      status: "confirmed",
    },
    {
      id: "reg_2",
      eventId: "event_friday_magic",
      memberProfileId: "member_jon",
      status: "checked_in",
      checkedInAt: new Date(),
    },
  ]);

  const signUpResult = await auth.api.signUpEmail({
    body: {
      email: STAFF_EMAIL,
      password: STAFF_PASSWORD,
      name: "Store Owner",
    },
  });

  await db.insert(memberships).values({
    id: "membership_owner",
    organizationId: ORG_ID,
    userId: signUpResult.user.id,
    role: "owner",
    status: "active",
  });

  console.log("Done.");
  console.log("");
  console.log("Staff login:");
  console.log(`  email:    ${STAFF_EMAIL}`);
  console.log(`  password: ${STAFF_PASSWORD}`);
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
