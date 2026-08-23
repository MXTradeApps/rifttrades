<!--
Sync Impact Report
- Version change: 1.0.0 → 1.1.0
- Modified principles: none
- Modified constraints: 3 (peer web client lives at apps/web in this repo),
  4 (Collection is allowed as the default keep-pile Binder name)
- Modified sections: Engineering Practice → Repository (web is a peer
  client here, not a second product repo)
- Added sections: none
- Removed sections: none
- Follow-up TODOs: none
- Sources:
  - specs/001-fab-parity (T007)
  - context.md vocabulary update in the same change
-->

# RiftTrades Constitution

RiftTrades is a trade companion for Riftbound players: stack two piles,
see a trustworthy diff, and close the trade. Flutter (`apps/mobile`) and
web (`apps/web`) are peer clients in this repo on one Supabase catalog.
This constitution governs how we change that system. It supersedes habit,
template defaults, and stale docs.

Craftsmanship here follows the Matsen Group clean-code reviewer (Uncle Bob
with fail-fast, naming, and honest tests) and the pipeline-expert stance
(explicit config, modular ingest, reproducible CI) — adapted to a Node
price pipeline, not Snakemake. Perfection is not a principle. Shipping a
correct, readable change that helps a player at the table is.

## Core Principles

### I. Good Enough Ships

A change that is correct, readable, and useful MUST ship. A change that is
theoretically cleaner, more complete, or more "future-proof" MUST NOT block
that ship.

- MUST solve the actual player or operator problem in front of us.
- MUST NOT gold-plate: extra abstractions, extra surfaces, extra config, or
  extra coverage that does not reduce a real failure mode.
- SHOULD leave a TODO only when the follow-up is named and cheaper than
  doing it now. Open-ended "we should eventually…" is not a TODO.
- MUST NOT treat 80% coverage, full TDD, or a grand refactor as a gate.
  Those are tools. The gate is: does the trade math, the catalog, the sync,
  or the entitlement still tell the truth?

Rationale: the product exists for a live table. Delay that does not protect
correctness is delay a player feels. Perfect is the enemy of good.

### II. Code That Reveals Intent

Code MUST be readable by the next agent and the next human without a tour.
Names MUST match actual behavior. Functions and types MUST do one job.

- MUST use names that distinguish observed from derived data (a TCGplayer
  market price vs a computed side total vs a suggested filler).
- MUST keep functions small enough that the name is the spec. If the name
  needs "and", split it — unless splitting would hide a single business
  step that belongs together (Confirm Trade is one action).
- MUST prefer top-level imports. Inline imports are allowed only for a
  heavy dependency with a documented performance reason.
- MUST NOT mix unrelated concerns in one type (catalog row vs binder entry
  vs entitlement vs UI state).
- SHOULD eliminate duplication after it has proven itself (roughly a third
  copy, or two copies that have already drifted). MUST NOT invent a shared
  layer for a single use.
- MUST document the hard systems in one place with examples: cloud sync,
  entitlements, environments, scan, trade filler. Code comments explain
  *why this line*, not *what the next line does*.

Rationale: Flutter and web already duplicate business rules. Unclear names
and mixed types make that duplication lie. Clean code here is how we keep
two implementations honest without a shared runtime.

### III. Fail Fast, Never Silent

Bad data, missing config, and impossible states MUST stop the process with
a clear error. Silent fallback is a defect.

- MUST refuse to start a client that was not told its Supabase project at
  build time. MUST NOT default a test build to production.
- MUST fail ingest when required pipeline parameters are missing
  (`SUPABASE_URL`, service role, and the like). MUST NOT `get(key, default)`
  a required value.
- MUST validate at the boundary: printing ids, foil subtypes, environments,
  entitlement writes. Prefer enums, literals, and constants over strings
  that are only checked at runtime.
- MUST surface errors the operator can act on. Swallowing an exception to
  "keep going" is forbidden unless the catch documents *which* failure is
  ignorable and *why*.
- SHOULD assert invariants in trade math, sync timestamps, and webhook
  auth rather than paper over them.

Rationale: a wrong price or a sandbox purchase writing production Pro is
worse than a crash. Fail-fast is how this repo already treats environments
and entitlements; the rest of the code MUST match.

### IV. Honest Tests, Shared Contracts

Tests MUST exercise real behavior. Mocks are a last resort. Where Dart and
JavaScript implement the same rule, a shared expected value is the source
of truth — a comment that says "keep in sync" is not a test.

- MUST add or update a matching assertion on both clients when a rule
  exists in Flutter and web (trade math, set sort, abbreviations, free-tier
  limits, brand palette, card stub shape). Both suites MUST assert the
  same numbers and the same stub fields.
- MUST fix the implementation that drifted, not the fixture, unless the
  product decision itself changed — then change the expected value and
  both sides.
- MUST prefer real fixtures and real catalog-shaped data over
  `{"dummy": "values"}` and over mocks that return the answer the test
  wanted.
- MUST NOT skip tests without a one-line justification tied to an
  environment or a missing credential. A skip that means "not implemented"
  is a failing test.
- SHOULD write the test that would have caught the bug, not a wall of
  rendering tests that never touch the rule.
- MUST treat `apps/mobile/lib/core/logic/free_limits.dart` as data-loss
  prevention: drift there can tombstone a customer's trades. Those caps
  are non-negotiable and MUST match the web client.

Rationale: the two clients cannot share code. Matching assertions are the
only build that fails when they disagree. Mock-heavy suites create a green
board that still ships a wrong diff. This repo has no `packages/contracts`;
do not invent one for a single use. Document the contract in `context.md`
and `docs/port/WEB-CONVENTIONS.md` until a shared fixture earns its keep.

### V. Reproducible Ingest, Explicit Config

The price pipeline is the catalog factory. It MUST be deterministic,
idempotent, and boring to operate. Apps MUST read the catalog; they MUST
NOT scrape, guess, or commit price data.

- MUST keep ingest (`services/price-pipeline`) separate from client apps.
  Transform logic lives in modules with names, not in one-off script
  bodies.
- MUST keep required configuration explicit (env / secrets). Hardcoded
  paths, project refs, and "helpful" defaults for required keys are
  forbidden.
- MUST preserve `npm run dry-run` as a no-write path and `npm run ingest`
  as the write path. Re-runs MUST upsert, not duplicate.
- MUST log pipeline runs (`pipeline_runs`) so a bad day is diagnosable.
- SHOULD keep a small, committable fixture of transform cases for CI.
  Full TCGCSV dumps MUST NOT land in git.
- MUST document inputs, outputs, and table mappings in the pipeline README
  (TCGCSV + CardMarket → `sets` / `cards` / `card_prices` /
  `price_history` / `cards_with_prices`).
- MUST NOT invent or estimate a price the catalog cannot source. Unpriced
  is null. Null is shown as unpriced, never as zero.

Rationale: this is the Snakemake-expert bar — modular workflow, explicit
config, small CI, documented I/O — applied to the Node ingest we actually
run. If the catalog is wrong, every client is wrong.

## Product Constraints

These are durable product rules. Features that violate them are out of
scope until the constitution is amended.

1. **The table is the deadline.** Every core flow is judged by how fast a
   player mid-trade gets from two piles to a trustworthy diff. Browse,
   Binder, scan, history, and Pro exist to serve that moment.
2. **No gate before value.** Balancing a trade and checking prices MUST
   work signed out and SHOULD work offline for data already on device.
   Accounts add cloud sync and history; they MUST NOT be required to use
   the balancer.
3. **One brand, two peer surfaces.** Flutter and web share one design
   language and one catalog. A decision on one surface MUST be native to
   the brand on the other. iOS and Android are one Flutter codebase, not
   two ports. Flutter and web are peer clients **in this repo**. Web
   product UI lives at `apps/web/`. Do not send web work to a second
   product repo.
4. **Speak the trader's language.** `context.md` is authoritative.
   The product noun is **Binder**. **Trade Binder** is the tradeable-stock
   Binder (`role = trade`). **Collection** is allowed as the default
   keep-pile Binder **name** (`role = standard`); do not rename the Binder
   destination or tab to Collection. Want List is still not a Binder.
   Use Trade Filler, Confirm Trade (not Save Trade), Printing
   (`<product_id>-<subtype>`), Finish (Riftbound Normal / Foil),
   Condition (NM/LP/MP/HP/DMG, descriptive only — no price adjustment).
   Do not rename domain terms per surface.
5. **Real prices or nothing.** Values trace to the ingested TCGplayer and
   CardMarket catalog. The product MUST NOT fabricate prices, testimonials,
   or affiliation with Riot Games or TCGplayer.
6. **Local reads, background sync.** Device storage is the source of
   truth for reads. Sync reconciles in the background (last write wins per
   record, tombstoned deletes). A screen that waits on the network to draw
   data already on device is a regression.
7. **Server-owned Pro.** A purchase acquires access; access is a Postgres
   row. Clients MAY read their entitlement. Clients MUST NOT write it.
   RevenueCat webhook (and nightly reconcile) are the only writers.
8. **Build-time environment.** Production and staging are chosen at build
   time. A build that is not told which project it is MUST fail. Sandbox
   purchases MUST be physically unable to reach production.
9. **Not a marketplace, not a rules engine.** We show prices and track
   trades, Binder, wants, and lends. We do not broker sales or simulate
   gameplay / deck legality.

## Engineering Practice

### Repository

- This repo holds both peer clients plus ingest and Supabase. Flutter
  lives at `apps/mobile`. Web product UI lives at `apps/web`. Run
  commands from the app or service directory that owns the dependency
  (`apps/mobile`, `apps/web`, `services/price-pipeline`).
- Schema lives in `supabase/migrations`. Edge Functions live in
  `supabase/functions`. Do not "just edit prod."
- Each app owns its dependencies. Do not introduce a fake monorepo
  workspace that neither client uses.
- Secrets stay out of git (`.env`, `apps/mobile/env/*.local.json`,
  service role keys). Publishable Supabase keys are not service role keys.

### Dual-client DRY

Because the runtimes cannot share code, DRY across Flutter and web means
shared *fixtures and vocabulary*, not a premature shared library.
Mobile-only behavior (scan, Binder reconciliation, trade filler, lends)
MUST NOT be forced onto web "for symmetry." Web MUST use the same card
stub fields and `rift_*` table/RPC names as mobile.

### Review

Reviews follow the clean-code reviewer shape: strengths first, then
critical issues, then improvements. Prioritize changes that protect
correctness or maintainability. Style nits that do not survive principle I
are optional.

Flag with high priority: silent error handling, stringly-typed domain
values, mock-only tests, contract drift, client writes to entitlements,
runtime environment switching, and domain-term misuse.

### Documentation

Prefer living docs over archaeology:

| Topic | Source of truth |
| --- | --- |
| Vocabulary | `context.md` |
| Sync | `docs/ARCHITECTURE.md` (Cloud sync) |
| Entitlements | `docs/ENTITLEMENTS.md` |
| Environments | `docs/ENVIRONMENTS.md` |
| Dual-client rules | `docs/port/WEB-CONVENTIONS.md` |
| Ingest | `services/price-pipeline/README.md` |
| Layout and how to run | root `README.md` |

Stale plan docs (`docs/PORT_PLAN.md` coverage theater, older mobile
handoff paths, Collection-era notes) MUST NOT override this constitution
or the table above. Update the living doc in the same change when
behavior changes. `docs/port/` phase files are execution history once
Done; they do not outrank this file.

## Governance

This constitution supersedes conflicting practice in specs, plans, and
code review. A spec that requires an account to balance a trade, a plan
that invents prices, or a PR that "temporarily" writes entitlements from
the client is non-compliant.

Amendments:

- MUST be written into this file with a version bump and a Sync Impact
  Report comment at the top.
- MAJOR: remove or redefine a principle, or weaken a Product Constraint.
- MINOR: add a principle or materially expand guidance.
- PATCH: clarification, wording, typo, no semantic change.
- LAST_AMENDED_DATE is the date of the change. RATIFICATION_DATE does not
  move.

Compliance:

- Spec Kit plans and tasks MUST cite the principles they touch.
- PRs that change trade math, free limits, sync, entitlements, ingest, or
  domain vocabulary MUST show the matching contract, test, or doc update.
- Complexity and new dependencies MUST justify themselves against
  principle I (they pay for themselves now, not in a hypothetical later).
- When two principles collide, I (ship good) yields to III, IV, and the
  Product Constraints — never the other way around. We ship the simple
  correct thing, not the pretty wrong thing.

**Version**: 1.1.0 | **Ratified**: 2026-08-22 | **Last Amended**: 2026-08-22
