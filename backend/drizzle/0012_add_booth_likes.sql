CREATE TABLE "booth_likes" (
	"user_id" uuid NOT NULL,
	"booth_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booth_likes_user_id_booth_id_pk" PRIMARY KEY("user_id","booth_id")
);
--> statement-breakpoint
ALTER TABLE "booth_likes" ADD CONSTRAINT "booth_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booth_likes" ADD CONSTRAINT "booth_likes_booth_id_booths_id_fk" FOREIGN KEY ("booth_id") REFERENCES "public"."booths"("id") ON DELETE no action ON UPDATE no action;