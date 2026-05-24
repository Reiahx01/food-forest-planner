# 0003 — Role gating in Postgres RLS, not application middleware

- **Status:** Proposed (2026-05-24) — operator review pending
- **Deciders:** @Reiahx01

## Context

The product has two user roles — **hobbyist** (free, one property, design own land) and **pro** (paid, multiple clients, design for clients) — and these roles gate visibility and write-access across most tables:

- A hobbyist cannot read or write the `clients` table.
- A pro can read/write `clients` rows where `clients.pro_user_id = auth.uid()`.
- A pro can read/write `properties` rows where `properties.assigned_client_id` belongs to one of their clients.
- Both roles can read/write `properties` they own directly.

The question: **where does this enforcement live?**

The two extremes:

1. **Application middleware.** Every API route checks the user's role + ownership before reading/writing. Database lets through whatever the app sends.
2. **Postgres Row-Level Security (RLS).** Every table has policies that say "row visible only when X." Application code passes the user's JWT to Supabase; the database refuses requests that violate policy. Application middleware becomes optional.

[Operator: verify this framing matches your planning notes.]

## Decision

**RLS is the security boundary. The application layer can be misread, refactored carelessly, or forgotten — RLS cannot be bypassed except by code with the service-role key, which never runs in user-facing paths.**

Specifically:

- **Every user-data table has RLS enabled** (`alter table X enable row level security`). Tables without RLS-applicable scope (e.g. `species` library reads) get explicit `using (true)` policies so the intent is visible.
- **Policies are written per table per operation** (`select`, `insert`, `update`, `delete`) — never a single permissive policy that covers all operations.
- **Application middleware does NOT re-enforce the same rules.** It can do upstream validation (return a clean 403 before the query) but the database is the source of truth. If they disagree, the database wins by construction.
- **The `service_role` key is used only in server-side admin paths** that need to bypass RLS (e.g. background jobs, seed scripts, the admin panel). It is never exposed to the browser and never read by code that runs in response to a user request without an explicit role check.
- **Tests run against a real Supabase instance** (`npx supabase start` in dev + CI). RLS bugs are caught by integration tests, not by trusting mocked stubs. See ADR-0001 for the integration-test policy.

### Mock-mode for unit tests

Some unit tests don't need a real database (e.g. pure component tests, validator tests). For those, an **`isMockMode()` switch** returns canned data instead of hitting Supabase. Mock mode:

- Returns the **same data shape** as real queries (no `null vs undefined` divergence).
- **Fails loud on writes** — any attempt to mutate via mock-mode throws, so a forgotten mock + real-mode-only test path can't silently pass.
- Reads from `process.env.IS_MOCK_MODE === '1'`, set in test setup.

## Consequences

**Accepted positives:**

- **A coding mistake in application middleware cannot leak data across tenants.** The worst case is "the app sends a request and Postgres rejects it" — visible as an error, not a data leak.
- **The security model is auditable by reading one set of files** (the `supabase/migrations/*` policy SQL), not by reading every API route.
- **Refactors don't silently regress access control.** Moving a query from one route to another doesn't change what the user can see — RLS travels with the data, not the code.
- **External integrators (CLI tools, mobile apps later, etc.) get the same enforcement** because they go through the same Postgres connection with the same JWT.

**Accepted negatives:**

- **RLS policies are SQL.** Some developers find SQL policies harder to read than TypeScript middleware. Mitigated by keeping policies short, well-commented, and tested.
- **Query plans can become surprising.** A policy that joins to a `clients` table to check ownership can prevent index use. Mitigated by always indexing the columns RLS predicates filter on (e.g. `clients.pro_user_id`).
- **Local development requires Supabase running.** `npx supabase start` (Docker) is the standard workflow. Documented in CONTRIBUTING.md.
- **Mock mode is a leak risk if misused.** If `IS_MOCK_MODE=1` accidentally ends up in a production env, the app would short-circuit real DB queries. Mitigated by an assertion at server boot: mock mode + `NODE_ENV=production` → fail-fast crash.

## Alternatives considered

- **All enforcement in application middleware.** Familiar, easy to debug, easy to mock. Rejected: one missed `if (user.role !== 'pro')` check is a tenant-data leak. RLS makes that class of bug unreachable.
- **Hybrid: RLS for sensitive tables, app middleware for the rest.** Tempting as a compromise. Rejected: it forces every contributor to remember which tables fall in which bucket. Uniform "everything is RLS" is simpler and harder to get wrong.
- **Cell-level encryption** for very sensitive fields (e.g. client addresses). Out of scope for v1; revisit if a feature requires it (e.g. medical-grade data).

## Revisit condition

Open a new ADR superseding this one if any of these tripwires fire:

- **A security incident traces to an RLS bypass or misconfiguration**. → Reopen and decide whether to add a redundant app-layer enforcement, or whether the fix is policy-level.
- **A meaningful query is unfixably slow** because of RLS. Specifically: a query the app needs in the editor's hot path runs > [Operator: name a threshold — suggested: 200ms P95] after exhausting indexing options. → Consider materialized views, or carve out a service-role-backed read path with explicit isolation checks.
- **Supabase changes its RLS guarantees** in a way that breaks our assumptions (e.g. silently disabling RLS on some operations). → Reopen.
- **The service-role key gets exposed** via any code path. → Immediate incident; this ADR doesn't get reopened, but the incident response process does.

[Operator: verify the latency threshold and confirm whether you want any redundant app-layer checks for the most sensitive tables — RLS-only is the proposed default, but defense-in-depth is a reasonable variant.]
