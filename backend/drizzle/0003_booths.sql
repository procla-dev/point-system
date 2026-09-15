CREATE TABLE "booths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "booth_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_booth_id_booths_id_fk" FOREIGN KEY ("booth_id") REFERENCES "public"."booths"("id") ON DELETE no action ON UPDATE no action;