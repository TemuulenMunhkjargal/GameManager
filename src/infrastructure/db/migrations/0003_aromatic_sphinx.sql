ALTER TABLE "memberships" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "invited_email" text;