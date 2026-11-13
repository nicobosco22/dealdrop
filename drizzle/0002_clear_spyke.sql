ALTER TABLE "deals" ADD COLUMN "insights" jsonb;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "verdict" text;--> statement-breakpoint
CREATE INDEX "deals_score" ON "deals" USING btree ("score");