# Contributing to food-forest-planner

Thanks for considering a contribution. This project is built in the open under AGPL-3.0 and welcomes pull requests, issues, plant-data corrections, and design feedback.

## Quick start

```bash
# 1. Fork + clone
git clone git@github.com:<your-username>/food-forest-planner.git
cd food-forest-planner

# 2. Install + boot the local Supabase stack (Docker required)
npm install
npm run db:start       # boots Postgres + PostGIS + Auth + Storage in Docker
npm run db:migrate     # applies supabase/migrations/*.sql

# 3. Copy the printed URL + keys into `.env.local`
cp .env.example .env.local
npm run db:status      # prints API_URL / ANON_KEY / SERVICE_ROLE_KEY / DB_URL

# 4. Boot the Next.js dev server
npm run dev            # http://localhost:3000

# 5. Run the test battery before pushing (with dev server STOPPED)
npm run typecheck
npm run lint
npm test               # unit tests only -- IS_INTEGRATION unset
IS_INTEGRATION=1 npm test   # add the integration tests; requires db:start running
npm run build

# 6. Tear down the local stack when done
npm run db:stop
```

The full local battery should be green before you push. CI runs the same four checks on every merge to `main`, plus an `integration` job that boots a real Supabase locally and runs the IS_INTEGRATION=1 path.

### Database conventions

- **Migrations** are hand-written SQL under `supabase/migrations/<NNNN>_<name>.sql`. The Supabase CLI is the single migration runner -- `npm run db:migrate` (incremental) or `npm run db:reset` (drop + reapply).
- **Drizzle** is the typed-query layer (`db/schema/`, `db/client.ts`). When a table changes, run `npm run db:generate` to emit the matching migration into `supabase/migrations/`, then commit both the schema file and the generated SQL.
- **RLS** is enabled on every table (per ADR-0003). Each new schema file ships its own policies in the same migration; PRs that add a table without RLS won't merge.
- **PostGIS** is enabled in `0000_init.sql`; geometry columns (e.g. `parcel_outline` in `properties`, #10) use `geometry(Polygon, 4326)`.

### Running the app in Docker (self-hosters)

The project ships a multi-stage `Dockerfile` for the Next.js app. Supabase is run separately (via `npx supabase start` locally, or against a hosted/self-hosted Supabase project in production).

```bash
docker build -t food-forest-planner .

docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  -e DATABASE_URL=... \
  food-forest-planner
```

The image relies on Next.js's `output: 'standalone'` (set in `next.config.ts`) -- runtime image is ~150 MB and runs as an unprivileged `nextjs` user.

## Project structure

```
app/
  brand/        # canonical brand tokens (TS source) + font wiring + parity tests
  …             # routes added per-feature
docs/adr/       # Architecture Decision Records — read before touching adjacent code
docs/v1-plan.md # the canonical v1 spec (also referenced by CLAUDE.md)
.github/
  workflows/    # CI + DCO
```

## How to pick an issue

Open issues are at https://github.com/Reiahx01/food-forest-planner/issues. Look for `tracer-bullet` + `needs-triage` labels for vertical-slice work.

Each issue's `Blocked by` list points at prerequisites. Don't start an issue whose blockers haven't shipped.

## Hard rules

These aren't suggestions. PRs that violate them won't merge.

### Test-Driven Development is mandatory

Every production file must be preceded by a failing test that watched it fail. Per [superpowers:test-driven-development](https://github.com/anthropic-labs/superpowers): RED → GREEN → REFACTOR.

- Write code before the test? Delete it. Start over.
- Tests passing immediately on first run prove nothing.
- Exceptions: scaffold output (`create-next-app`), configuration files. When in doubt, ask in your PR.

### Interface architecture for extensible surfaces

Element types, sectoring overlays, plant-library sources, and similar plug-in surfaces implement a single typed interface (e.g. `ElementTypeModule<TAttrs>`). Adding a new variant = drop in one module file; never branch on type inside the consumer.

If the interface won't accommodate a new variant cleanly, **fix the interface** rather than threading a special case.

### Brand DON'T list

See [`AGENTS.md`](../AGENTS.md). The anti-generic Tailwind palette ban is enforced at test time via `app/page.test.tsx`. PRs that introduce `bg-zinc-*`, `text-gray-*`, `dark:bg-black`, `shadow-md`, `transition-all`, or any default Tailwind palette utility will fail CI.

### DCO sign-off required

Every commit must carry a `Signed-off-by:` trailer certifying you authored the change under the [Developer Certificate of Origin](https://developercertificate.org). Enforced by `.github/workflows/dco.yml`.

```bash
# Set once
git config user.name "Your Name"
git config user.email "you@example.com"

# On every commit
git commit -s -m "feat(#NN): your change"

# Fix a forgotten sign-off
git commit --amend -s --no-edit
git rebase --signoff origin/main   # for multiple commits
git push --force-with-lease
```

### Tracer-bullet PRs

Each PR should cut through every relevant layer (schema → API → UI → tests) for one feature slice. Avoid PRs that touch only the schema layer + leave UI for a follow-up — they accumulate untested code paths.

### Architecture Decision Records

Load-bearing decisions live as ADRs in [`docs/adr/`](../docs/adr/) — one file per decision, numbered `NNNN-slug.md`. Read the [ADR index](../docs/adr/README.md) before touching adjacent code; the ADRs document _why_ the current shape exists, which is information the code itself cannot carry.

Write a new ADR when:

- A **load-bearing technology** is chosen or replaced (auth provider, database, map renderer, billing platform).
- A **plug-in surface contract** is defined or significantly changed.
- A **security or data-isolation boundary** is established or moved.
- A **legal / licensing decision** is made.
- A **product-scope cut or deferral** is made that other contributors will repeatedly bump into.
- A previous ADR's **revisit condition trips** — write a new ADR superseding the old one rather than editing the old one in place.

Do NOT write an ADR for routine refactors, file moves, dependency bumps within the same ecosystem, or choices that can be reversed in a single PR without contributor coordination.

Each ADR follows the structure documented in [`docs/adr/README.md`](../docs/adr/README.md), including a **Revisit condition** — the tripwire (with a measurable threshold) that should force us to reopen the decision. Decisions without revisit conditions ossify into law; we don't ship those.

## Opening a PR

1. Branch from `main` (or from the relevant blocker branch if stacked): `git checkout -b NN-short-name` where `NN` is the issue number.
2. Implement TDD-first; commits should tell the red → green → refactor story.
3. Run the local battery (typecheck + lint + test + build) with the dev server **stopped**.
4. Push and open a PR titled `feat(#NN): one-line description`.
5. PR description: what shipped, test results, any operator follow-up.

Merge gates (per ADR-0001 and the trigger change in PR #31):

- **PR-time**: only DCO runs on PRs (~5s). It must be green. The four CI jobs (typecheck, lint, vitest, next build) **do not run on PRs by design** — the contributor's local pre-push battery is the gate.
- **Post-merge**: the four CI jobs run against the rebased commits on `main`. Failures fix-forward or revert.
- **Structural rules** enforced by branch protection: linear history (rebase-only), no force-push to `main`, no direct push to `main`, signed-off-by trailer on every commit.

A `needs-triage` issue label clears when the issue moves to `in-progress`.

## Plant library contributions

The curated species seed at `db/seeds/species.json` (landing in issue #15) accepts community PRs for new species or corrections to existing entries. Per-account private species + community-moderated additions are roadmapped at v1.1 and v1.2 respectively.

## Reporting bugs / proposing features

Open a GitHub issue with the `needs-triage` label. For bugs, include:

- What you expected vs what happened
- Steps to reproduce
- Browser + OS + Node version
- Any console errors

## Code of Conduct

This project adopts the [**Contributor Covenant 2.1**](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) verbatim. The summary below is for orientation; the canonical text at that link governs.

### Our pledge

We pledge to make participation in this project a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, caste, color, religion, or sexual identity and orientation.

### Standards

**Positive behavior we want more of:**

- Demonstrating empathy and kindness toward other people
- Being respectful of differing opinions, viewpoints, and experiences
- Giving and gracefully accepting constructive feedback
- Accepting responsibility, apologizing to those affected by mistakes, and learning from the experience
- Focusing on what is best for the overall community

**Behavior we won't tolerate:**

- Sexualized language or imagery, and sexual attention or advances of any kind
- Trolling, insulting or derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information (physical or email address, account credentials) without their explicit permission
- Other conduct which could reasonably be considered inappropriate in a professional setting

### Scope

This Code applies in all project spaces (issues, PRs, discussions, the codebase) and also when an individual is officially representing the project in public spaces (a stated project email address, posting via an official social media account, acting as an appointed representative at an event).

### Reporting

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported confidentially via this project's [**private security advisory form**](https://github.com/Reiahx01/food-forest-planner/security/advisories/new). The advisory channel is private to the maintainer and reporter; it's appropriate for Code of Conduct reports even though the UI is framed around security vulnerabilities. All complaints will be reviewed and investigated promptly and fairly.

The maintainer is obligated to respect the privacy and security of the reporter of any incident.

### Enforcement

The Contributor Covenant 2.1 [enforcement guidelines](https://www.contributor-covenant.org/version/2/1/code_of_conduct/#enforcement-guidelines) define a four-step escalation ladder used by this project:

1. **Correction** — private written warning, clarity on the violation, public apology may be requested.
2. **Warning** — consequences for continued behavior, no interaction with those enforcing for a specified period.
3. **Temporary ban** — temporary ban from any sort of interaction or public communication with the community.
4. **Permanent ban** — permanent ban from any sort of public interaction within the community.

The full guidelines (including the criteria for each step) are at the link above.

### Attribution

This Code of Conduct is adapted from the [Contributor Covenant, version 2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/), available under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Community Impact Guidelines were inspired by [Mozilla's code of conduct enforcement ladder](https://github.com/mozilla/inclusion).

For answers to common questions about this Code, see the FAQ at [contributor-covenant.org/faq](https://www.contributor-covenant.org/faq). Translations are available at [contributor-covenant.org/translations](https://www.contributor-covenant.org/translations).

## License

By contributing, you agree your work is licensed under AGPL-3.0 (the project license).
