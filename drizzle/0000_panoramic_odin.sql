CREATE TABLE "deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"source_id" text NOT NULL,
	"title" text NOT NULL,
	"store" text NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"price_cents" integer NOT NULL,
	"list_price_cents" integer,
	"url" text NOT NULL,
	"image_url" text,
	"source_updated_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_checked_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"deal_id" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"seen_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "price_points" ADD CONSTRAINT "price_points_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deals_source_source_id" ON "deals" USING btree ("source","source_id");--> statement-breakpoint
CREATE INDEX "deals_last_checked" ON "deals" USING btree ("last_checked_at");--> statement-breakpoint
CREATE INDEX "price_points_deal" ON "price_points" USING btree ("deal_id","seen_at");