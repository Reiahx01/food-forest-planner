-- 0000_init.sql -- Bootstrap migration (issue #4).
--
-- The shape of this migration is intentionally minimal: enable the extensions
-- every subsequent migration assumes, and nothing else. Application schema
-- begins in #5 (accounts) and #10 (properties).
--
-- All extensions are installed into the dedicated `extensions` schema (per
-- Supabase convention) -- the `public` search_path then includes
-- `extensions` via the config.toml `extra_search_path` setting.

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "postgis"   with schema extensions;

-- Sanity check: this migration is idempotent. Running it a second time is a
-- no-op because every `create extension` uses `if not exists`. The Supabase
-- migration runner additionally tracks applied filenames in
-- supabase_migrations.schema_migrations, so `supabase migration up` is also
-- naturally idempotent at the runner level.
