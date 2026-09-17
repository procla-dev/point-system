CREATE TABLE "point_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"grant_points" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "point_settings_grant_points_positive" CHECK ("point_settings"."grant_points" > 0)
);
--> statement-breakpoint
ALTER TABLE "booths" DROP CONSTRAINT "booths_point_value_positive";--> statement-breakpoint
ALTER TABLE "booths" DROP COLUMN "point_value";