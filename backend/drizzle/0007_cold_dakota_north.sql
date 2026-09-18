ALTER TABLE "sessions" ADD COLUMN "expires_at" timestamp with time zone;
UPDATE "sessions" SET "expires_at" = "created_at" + interval '1 day' WHERE "expires_at" IS NULL;
ALTER TABLE "sessions" ALTER COLUMN "expires_at" SET NOT NULL;
