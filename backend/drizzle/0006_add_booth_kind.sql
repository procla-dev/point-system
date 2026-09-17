CREATE TYPE "public"."booth_kind" AS ENUM('entrance', 'exhibitor', 'exchanger');--> statement-breakpoint
ALTER TABLE "booths" ADD COLUMN "kind" "booth_kind" NOT NULL;