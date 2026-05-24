# Contributing to food-forest-planner

Thanks for considering a contribution. This project is built in the open under AGPL-3.0 and welcomes pull requests, issues, plant-data corrections, and design feedback.

## Quick start

```bash
# 1. Fork + clone
git clone git@github.com:<your-username>/food-forest-planner.git
cd food-forest-planner

# 2. Install + boot
npm install
npm run dev   # http://localhost:3000

# 3. Run the test battery before pushing (with dev server STOPPED)
npm run typecheck
npm run lint
npm test
npm run build
```

The full local battery should be green before you push. CI runs the same four checks and gates merges on them.

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

## Opening a PR

1. Branch from `main` (or from the relevant blocker branch if stacked): `git checkout -b NN-short-name` where `NN` is the issue number.
2. Implement TDD-first; commits should tell the red → green → refactor story.
3. Run the local battery (typecheck + lint + test + build) with the dev server **stopped**.
4. Push and open a PR titled `feat(#NN): one-line description`.
5. PR description: what shipped, test results, any operator follow-up.

CI gates: typecheck + lint + test + build + DCO. All four must be green to merge. A `needs-triage` issue label clears when the issue moves to `in-progress`.

## Plant library contributions

The curated species seed at `db/seeds/species.json` (landing in issue #15) accepts community PRs for new species or corrections to existing entries. Per-account private species + community-moderated additions are roadmapped at v1.1 and v1.2 respectively.

## Reporting bugs / proposing features

Open a GitHub issue with the `needs-triage` label. For bugs, include:

- What you expected vs what happened
- Steps to reproduce
- Browser + OS + Node version
- Any console errors

## Code of Conduct

This project follows the [Contributor Covenant 2.1](./CODE_OF_CONDUCT.md). Be kind, be specific, assume good faith.

## License

By contributing, you agree your work is licensed under AGPL-3.0 (the project license).
