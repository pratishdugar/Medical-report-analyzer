-- Row-level security for all health-data tables.
--
-- Every query on these tables only sees / writes rows whose user_id equals the
-- transaction-local setting `app.user_id` (set by withUser() in
-- src/lib/db/index.ts). When the setting is absent, no rows are visible.
-- FORCE makes the policies apply to the table owner as well; only superusers
-- and BYPASSRLS roles skip them, which the app refuses to run as in production.

CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_share_token_hash() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.share_token_hash', true), '')
$$;
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "profiles" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "profiles_owner" ON "profiles"
  USING ("user_id" = app_current_user_id())
  WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "reports" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "reports_owner" ON "reports"
  USING ("user_id" = app_current_user_id())
  WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "observations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "observations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "observations_owner" ON "observations"
  USING ("user_id" = app_current_user_id())
  WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "history_entries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "history_entries" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "history_owner" ON "history_entries"
  USING ("user_id" = app_current_user_id())
  WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "audit_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "audit_owner" ON "audit_events"
  USING ("user_id" = app_current_user_id())
  WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "share_links" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "share_links" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "share_links_owner" ON "share_links"
  USING ("user_id" = app_current_user_id())
  WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
-- A visitor holding a share token may read and update (access counters) only
-- the single link whose hash matches the token they presented.
CREATE POLICY "share_links_by_token_select" ON "share_links" FOR SELECT
  USING ("token_hash" = app_share_token_hash());
--> statement-breakpoint
CREATE POLICY "share_links_by_token_update" ON "share_links" FOR UPDATE
  USING ("token_hash" = app_share_token_hash())
  WITH CHECK ("token_hash" = app_share_token_hash());
