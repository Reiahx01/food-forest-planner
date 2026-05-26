-- 0002_accounts_onboarded_at.sql -- add onboarded-at flag to accounts (#6)
--
-- The onboarding screen (role pick) needs a "has this user finished
-- onboarding yet?" signal. We add a dedicated nullable timestamptz instead
-- of using `display_name is null` as a proxy: users may legitimately leave
-- display_name blank, and conflating it with onboarding state would force
-- a default name onto unwilling users.
--
-- null = not yet onboarded; non-null = the moment they picked a role.

alter table public.accounts
  add column onboarded_at timestamptz;

-- Existing rows (from prior sign-ups in dev databases) get onboarded_at
-- backfilled to created_at so they don't get re-routed through onboarding
-- on their next sign-in. In production this is a no-op because there are
-- no existing users yet at v0.1.0.
update public.accounts
  set onboarded_at = created_at
  where onboarded_at is null;
