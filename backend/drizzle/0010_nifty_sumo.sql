ALTER TABLE "booths" ADD COLUMN "point_value" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "booths" ADD CONSTRAINT "booths_point_value_positive" CHECK ("booths"."point_value" > 0);