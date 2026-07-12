ALTER TABLE "organizations" ADD COLUMN "type" text DEFAULT 'game_store' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;