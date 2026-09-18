ALTER TABLE "booths" DROP CONSTRAINT "booths_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "staff" DROP CONSTRAINT "staff_booth_id_booths_id_fk";
--> statement-breakpoint
ALTER TABLE "booths" DROP COLUMN "team_id";--> statement-breakpoint
ALTER TABLE "staff" DROP COLUMN "booth_id";