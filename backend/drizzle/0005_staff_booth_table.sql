CREATE TABLE "staff" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"booth_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "staff" ("user_id", "booth_id") SELECT "id", "booth_id" FROM "users" WHERE "role" = 'staff';
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_booth_id_booths_id_fk";
--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_booth_id_booths_id_fk" FOREIGN KEY ("booth_id") REFERENCES "public"."booths"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "booth_id";