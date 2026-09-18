CREATE TABLE "staff_booths" (
	"user_id" uuid NOT NULL,
	"booth_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_booths_user_id_booth_id_pk" PRIMARY KEY("user_id","booth_id")
);
--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "staff_booths" ADD CONSTRAINT "staff_booths_user_id_staff_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."staff"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_booths" ADD CONSTRAINT "staff_booths_booth_id_booths_id_fk" FOREIGN KEY ("booth_id") REFERENCES "public"."booths"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
INSERT INTO "staff_booths" ("user_id", "booth_id") SELECT "user_id", "booth_id" FROM "staff" WHERE "booth_id" IS NOT NULL;--> statement-breakpoint
UPDATE "staff" SET "team_id" = "booths"."team_id" FROM "booths" WHERE "staff"."booth_id" = "booths"."id";
