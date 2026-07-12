ALTER TABLE "announcements" ADD COLUMN "scheduled_for" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "notify_discord" boolean DEFAULT false NOT NULL;