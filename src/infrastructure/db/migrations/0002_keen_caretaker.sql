CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"registration_id" text NOT NULL,
	"amount_in_cents" integer NOT NULL,
	"provider" text NOT NULL,
	"status" text NOT NULL,
	"provider_reference" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;