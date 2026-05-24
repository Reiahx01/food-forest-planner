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
