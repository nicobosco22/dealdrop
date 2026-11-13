CREATE TABLE "watches" (
	"id" serial PRIMARY KEY NOT NULL,
	"keyword" text NOT NULL,
	"max_price_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_notified_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "favorite" boolean DEFAULT false NOT NULL;