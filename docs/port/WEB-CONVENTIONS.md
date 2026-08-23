# Web port conventions

Read this fully before Phase 10. It is the web counterpart of
[`CONVENTIONS.md`](CONVENTIONS.md). Mobile phases still use `CONVENTIONS.md`;
Phases 10–12 use this file.

The web client is a **peer surface in this repo** at `apps/web/`. Do not
send product UI to a second repo (`/Users/joseescaler/Documents/riftrades`
is historical port target only).

## Paths (this machine)

| Name | Path |
| --- | --- |
| This repo | `/Users/joseescaler/Documents/rifttrades` |
| Flutter client | `/Users/joseescaler/Documents/rifttrades/apps/mobile` |
| Web client | `/Users/joseescaler/Documents/rifttrades/apps/web` |
| FAB Trades reference (read only) | `/Users/joseescaler/Documents/fabtrades` |

`/binder` is **grid-first** (Trade Binder + Collection tiles, then drill-in
to one Binder's list). Owned entries carry `binder_id`. Binder records live
in `rift_binders`. `/wants` stays the Want List and is not a Binder grid.
Do not invent signed-out web Binder storage.

## Product constants (web)

| Thing | Value |
| --- | --- |
| Product name in UI copy | `RiftTrades` |
| Pro tier name in UI copy | `RiftTrades Pro` |
| Trade draft localStorage key | `rifttrades-trade-draft` |
| Production Supabase project | fabloodle (`cnmxaccamqshgvesieez`) |
| Production Supabase URL | `https://cnmxaccamqshgvesieez.supabase.co` |
| Production publishable key | `sb_publishable_4hW7qDSTmCljfKl-dB43kQ_xSk0JFom` |

The interim project `tenrvaghaspwdvnwvgrh` is what the web app currently defaults
to. **Do not leave that default.** Web and mobile must share fabloodle so a
signed-in binder matches across clients.

## Database table / RPC renames (web JS + SQL)

RiftTrades user-data tables are `rift_`-prefixed. Catalog tables are unprefixed.

| Purpose | FAB Trades (source) | RiftTrades (what you write) |
| --- | --- | --- |
| Binder records | `binders` | `rift_binders` |
| Binder + want list | `binder_entries` | `rift_binder_entries` (owned rows carry `binder_id`) |
| Binder share tokens | `binder_shares` | `rift_binder_shares` |
| Trade history | `trades` | `rift_trades` |
| Pro access | `entitlements` | `rift_entitlements` |
| Public binder RPC | `get_public_binder` | `get_rift_public_binder` |
| Private binder RPC | `private.get_public_binder_by_token` | `private.get_rift_public_binder_by_token` |

Catalog (already correct on fabloodle, do not rename): `cards`, `sets`,
`card_prices`, and related views.

## Card stub shape (must match mobile)

`rift_binder_entries.card` is JSONB written by both clients. Mobile writes
`CardModel.toStub()` in
`apps/mobile/lib/core/models/card_model.dart`. Web `cardStub` / `parseCardStub`
must use **exactly** these fields (no FAB pitch/class extras required):

| Field | Notes |
| --- | --- |
| `id` | Catalog `cards.id` — on the web record this is `_uniqueId` |
| `product_id` | Integer or null |
| `name` | |
| `set_name` | |
| `sub_type_name` | Finish / printing label |
| `is_foil` | boolean |
| `rarity` | |
| `collector_number` | |
| `image_url` | Use this for art. **Never** build FAB CloudFront URLs |
| `tcg_market` | |
| `tcg_low` | |
| `cm_trend` | |
| `cm_low` | |

`card_id` column on the row = stub `id` = catalog `cards.id`.

## Brand renames when copying from FAB web

| Find | Replace with |
| --- | --- |
| `FAB Trades` | `RiftTrades` |
| `FABTrades Pro` | `RiftTrades Pro` |
| `FABTrades` | `RiftTrades` |
| `fabtrades-trade-draft` | `rifttrades-trade-draft` |
| `https://fabtrades.net` | `window.location.origin` (or omit hard-coded fallback) |
| `fabtrades.net` | the deployed RiftTrades web origin (ask if unknown) |
| `binder_entries` | `rift_binder_entries` |
| `binder_shares` | `rift_binder_shares` |
| `from('trades')` / `.from("trades")` | `rift_trades` |
| `from('entitlements')` | `rift_entitlements` |
| `get_public_binder` | `get_rift_public_binder` |

Do **not** apply these with a blind repo-wide find-and-replace. Apply per file.

## Do not port from FAB web

- `packages/contracts/` and any import of `brand_palette.json` / `free_limits.json`
  — define caps in `src/utils/freeLimits.js`; keep the Rift teal theme in
  `ThemeContext.jsx`
- FAB brown/tan CSS variables (`--fab-*`)
- `src/services/fabDb.js`, catalog snapshot / SEO generate scripts
- FAB CloudFront card art URL builders (`d2wlb52bya4y8z.cloudfront.net`, `-RF`/`-CF`)
- Pitch / Rainbow Foil / Cold Foil / `card_class` FAB-only UI
- FAB Google Analytics id / Flesh and Blood meta copy in `index.html` (keep
  Riftbound titles and existing analytics if present)

## Never overwrite in the web target

These already exist and carry Riftbound-only behaviour. Edit surgically; never
replace the whole file with the FAB version:

```
src/services/supabaseCardData.js
src/services/api.js
src/services/csv/          (entire tree)
src/hooks/useCardData.jsx
src/contexts/PriceContext.jsx   (keep market/low + tcgplayer/cardmarket)
src/contexts/ThemeContext.jsx   (keep teal/gold palette)
src/pages/SetView.jsx
src/components/elements/FindFillerDialog.jsx
src/utils/findFiller.js
src/theme.js                 (orphaned — leave alone or delete; do not replace with FAB)
public/price-guide/
csvs/
```

## Copy vs hand-merge

**Copy (then apply table/brand renames):**

```
src/contexts/AuthContext.jsx
src/contexts/EntitlementContext.jsx
src/components/auth/LoginButton.jsx
src/components/auth/SignInDialog.jsx
src/services/entitlements.js
src/services/binder.js
src/services/tradeHistory.js
src/services/confirmTrade.js
src/utils/freeLimits.js
src/utils/tradeDraft.js
src/utils/confirmTrade.js
src/pages/BinderCollection.jsx
src/pages/SharedBinder.jsx
src/pages/TradeHistory.jsx
```

**Hand-merge (read target first; take only the listed behaviours from source):**

```
src/App.jsx
src/main.jsx
src/lib/supabase.js
src/components/elements/Header.jsx
src/components/elements/TradeSummary.jsx
src/components/ui/CardList.jsx
src/components/ui/CardPanel.jsx
src/components/search/SearchInput.jsx
src/hooks/useTradeState.js
src/pages/Home.jsx
package.json
vite.config.js
index.html
```

## Free-tier caps (web + mobile must match)

| Cap | Value | Behaviour at the cap |
| --- | --- | --- |
| `binderCards` | 50 | refuse new distinct cards |
| `wantListCards` | 25 | refuse new distinct cards |
| `loanedCards` | 25 | refuse; borrowing uncapped (mobile only) |
| `savedTrades` | 3 | trim oldest; never refuse the save |
| `binders` | 4 | paywall; create nothing |

Quantity bumps on an existing binder/want card are never capped.

## Routes to add

| Path | Page |
| --- | --- |
| `/binder` | `BinderCollection` with `isWanted={false}` |
| `/wants` | `BinderCollection` with `isWanted={true}` |
| `/b/:token` | `SharedBinder` (public, no auth required) |
| `/history` | `TradeHistory` |

Keep existing `/` and `/privacy`. Do not replace the embedded `SetView` flow with
FAB's `/sets` routes unless a later phase says so.

## Verification commands (web target)

From `/Users/joseescaler/Documents/rifttrades/apps/web`:

```bash
npm install
npm test
npm run lint
npm run build
```

`npm test` and `npm run lint` only exist after Phase 10 adds them. From Phase 10
Verify onward, all four must pass (lint may be added in Phase 10; if the phase
skips wiring lint, at least `npm test` and `npm run build` must pass).

## Migrations

New SQL for web features is authored under the **mobile monorepo**:

`/Users/joseescaler/Documents/rifttrades/supabase/migrations/`

Apply by running the SQL against fabloodle (SQL editor or Supabase MCP), then
insert the version row by hand — same rules as `CONVENTIONS.md`. Never
`db push` / `db pull` / `db reset` against the shared project.

## Human blockers (stop and report)

- Production web origin (Netlify domain) unknown when a step needs the auth
  redirect allow-list or a hard-coded share fallback
- Fabloodle auth providers (Google, Discord, Apple, email) not enabled, or the
  web origin / `http://localhost:5173/**` missing from the redirect allow-list
- Netlify env still pointing at `tenrvaghaspwdvnwvgrh` after the code defaults
  move to fabloodle
- `cards` / `card_prices` empty on fabloodle (pipeline not writing)

## Commit style

One phase, one commit in the repo that phase edits (web repo for 10–12; mobile
monorepo for migrations in 11 and for Phase 13). Subject in the imperative,
under 72 characters. Each phase file gives the message.
