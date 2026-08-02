# Phase 11 — Binder, want list, and shareable binders

Port the web binder / want-list UI, shareable binder links, free-limit helpers,
and calculator draft persistence from FAB Trades.

Prerequisite: Phase 10 is `Done`. Read [`WEB-CONVENTIONS.md`](WEB-CONVENTIONS.md).

Source: `/Users/joseescaler/Documents/fabtrades/apps/web`
Target (JS): `/Users/joseescaler/Documents/riftrades`
Migrations: `/Users/joseescaler/Documents/rifttrades/supabase/migrations`

Also read the source migration once:

`/Users/joseescaler/Documents/fabtrades/supabase/migrations/20260802140000_binder_shares.sql`

## Steps

### 1. Author and apply `rift_binder_shares` migration

Create a new file in the **mobile monorepo**:

`supabase/migrations/20260802150000_rift_binder_shares.sql`

Base it on the FAB migration above, with these exact renames:

| FAB | RiftTrades |
| --- | --- |
| `public.binder_shares` | `public.rift_binder_shares` |
| `binder_shares_token_len` | `rift_binder_shares_token_len` |
| `binder_shares_token_idx` | `rift_binder_shares_token_idx` |
| Policy names mentioning binder share | Keep meaning; prefix with `rift_` if you like |
| `private.get_public_binder_by_token` | `private.get_rift_public_binder_by_token` |
| `public.get_public_binder` | `public.get_rift_public_binder` |
| Reads `public.binder_entries` | Reads `public.rift_binder_entries` |

Behaviour to preserve:

- Table columns: `user_id` PK → `auth.users`, `token` unique (≥16 chars),
  `is_enabled`, `created_at`, `updated_at`
- RLS: owner-only SELECT/INSERT/UPDATE/DELETE
- Partial index on `token` where `is_enabled = TRUE`
- Private SECURITY DEFINER function returns
  `{ entries: [{ card_id, quantity, condition, card, added_at, updated_at }, ...] }`
  for live binder rows only (`is_wanted = FALSE`, `deleted_at IS NULL`)
- Public wrapper is SECURITY INVOKER; EXECUTE granted to `anon` and
  `authenticated`

Apply the SQL against fabloodle (SQL editor or Supabase MCP `execute_sql`), then
record the version (same procedure as `CONVENTIONS.md`):

```sql
insert into supabase_migrations.schema_migrations (version, name)
values ('20260802150000', 'rift_binder_shares');
```

Do **not** run `npx supabase db push`.

Commit the migration file in the mobile monorepo (can be the same commit that
marks Phase 11 done, or an earlier commit — but the file must land before JS
that calls the RPC).

### 2. Port `freeLimits.js` and `tradeDraft.js`

Copy source → target:

| Source | Target |
| --- | --- |
| `src/utils/freeLimits.js` | `src/utils/freeLimits.js` |
| `src/utils/tradeDraft.js` | `src/utils/tradeDraft.js` |

Edits after copy:

- `freeLimits.js`: caps must be `binderCards: 50`, `wantListCards: 50`,
  `savedTrades: 3`, `loanedCards: 1`. Rename FABTrades → RiftTrades in comments.
  **Do not** import `packages/contracts/free_limits.json` — keep numbers inline.
- `tradeDraft.js`: set `TRADE_DRAFT_KEY = 'rifttrades-trade-draft'`. Keep the
  `{ v: 1, have, want }` shape and `loadTradeDraft` / `saveTradeDraft` /
  `addCardToTradeDraft` API.

### 3. Port `binder.js` with Rift table/RPC names and mobile stub

Copy `src/services/binder.js` from source. Then change:

1. Every `.from('binder_entries')` → `.from('rift_binder_entries')`
2. Every `.from('binder_shares')` → `.from('rift_binder_shares')`
3. `supabase.rpc('get_public_binder', …)` → `supabase.rpc('get_rift_public_binder', …)`
4. `binderShareUrl` fallback origin: do **not** use `https://fabtrades.net`.
   Prefer `typeof window !== 'undefined' ? window.location.origin : ''` (or omit
   the fallback and require `origin` argument).
5. Rewrite `cardStub` so the emitted object matches the mobile stub in
   `WEB-CONVENTIONS.md` (fields listed there). Drop FAB-only required fields
   (`pitch`, `card_type`, `card_class`) from the stub — they are not in
   RiftTrades mobile `toStub()`. Map web catalog fields:

   - `id` ← `card._uniqueId || card.id`
   - `product_id` ← numeric `card.productId` / `card.product_id`
   - `set_name` ← `card._setName || card.setName`
   - `sub_type_name` ← `card.subTypeName`
   - `is_foil` ← `card.isFoil` or subtype containing `"foil"`
   - `rarity` ← `card.rarity`
   - `collector_number` ← `card.number` / `card.collectorNumber`
   - `image_url` ← `card.imageUrl`
   - prices ← `marketPrice` / `lowPrice` / CardMarket fields as available

6. `parseCardStub` should reverse that mapping into web-friendly camelCase
   (`imageUrl`, `subTypeName`, `setName`, `tcgMarket`, etc.) without expecting
   pitch.

Keep the public API: `BINDER_CONDITIONS`, `cardStub`, `parseCardStub`,
`getBinderEntries`, `upsertEntry`, `removeEntry`, `checkCanAddBinderCard`,
`newBinderShareToken`, `binderShareUrl`, `getBinderShare`, `ensureBinderShare`,
`setBinderShareEnabled`, `regenerateBinderShare`, `getPublicBinder`.

### 4. Port binder pages

Copy:

| Source | Target |
| --- | --- |
| `src/pages/BinderCollection.jsx` | `src/pages/BinderCollection.jsx` |
| `src/pages/SharedBinder.jsx` | `src/pages/SharedBinder.jsx` |

After copy, adapt for Riftbound:

- Replace every FAB CloudFront / foil-suffix image URL builder with
  `entry.card.imageUrl` (or stub `image_url`). If the source builds
  `https://d2wlb52bya4y8z.cloudfront.net/...`, delete that helper and use the
  stub URL.
- Remove pitch / Rainbow Foil / Cold Foil badges. Show finish via
  `subTypeName` / `isFoil` only.
- Brand strings: FAB Trades → RiftTrades.
- Keep auth gate + `SignInDialog`, search-to-add, filter/sort, quantity /
  condition controls, share dialog on binder (not want list), and
  `addCardToTradeDraft('want', …)` on SharedBinder.
- Routes are separate pages (`isWanted` prop), not in-page tabs — keep that.

### 5. Add routes

In target `src/App.jsx`, inside the existing `AuthProvider` /
`EntitlementProvider` / `Routes`:

```jsx
import BinderCollection from './pages/BinderCollection.jsx';
import SharedBinder from './pages/SharedBinder.jsx';

<Route path="/binder" element={<BinderCollection isWanted={false} />} />
<Route path="/wants" element={<BinderCollection isWanted={true} />} />
<Route path="/b/:token" element={<SharedBinder />} />
```

Keep `/` and `/privacy`. Do not add `/history` yet (Phase 12).

### 6. Hand-merge Header nav (includes `1440e485` responsive fix)

Edit target `src/components/elements/Header.jsx`. From FAB Header (current HEAD,
which already includes the mobile-unsquish commit), take:

- Left group: hamburger + inline nav buttons **Trade Calculator** (`/` or home
  via `onNavigate`) and **My Binder** (`/binder`)
- Inline nav buttons: `display: { xs: 'none', sm: 'inline-flex' }`,
  `flexShrink: 0`, fontSize `0.875rem`
- Drawer list items: **My Binder** → `/binder`, **Want List** → `/wants`
  (plus existing set browsing and privacy)
- Keep LoginButton from Phase 10
- Keep teal/gold AppBar — do not switch to FAB brown palette
- Optional: fixed "Prices last updated" footer if it fits without breaking the
  Home layout; if it fights existing footer padding, skip and note it

Preserve `onNavigate` for sets. When navigating to `/binder` or `/wants`, use
`navigate` / `Link` (router paths), not `onNavigate`.

### 7. Merge draft persistence into `useTradeState.js`

Hand-merge into target `src/hooks/useTradeState.js` (do not overwrite):

From source, take the behaviour that:

1. On mount, if the URL does **not** already encode a trade, load
   `loadTradeDraft()` and hydrate have/want lists
2. Persist have/want via `saveTradeDraft` when lists change
3. URL-loaded trades win over localStorage

Keep all existing Riftbound URL encoding / price behaviour. Do not drop
CardMarket or FindFiller wiring that lives outside this hook.

### 8. Port and adapt tests

Copy and adapt:

| Source | Target |
| --- | --- |
| `tests/services/binder.test.js` | `tests/services/binder.test.js` |
| `tests/utils/tradeDraft.test.js` | `tests/utils/tradeDraft.test.js` |

Edits in tests:

- Expect table names `rift_binder_entries` / `rift_binder_shares`
- Expect RPC `get_rift_public_binder`
- Expect localStorage key `rifttrades-trade-draft`
- Stub shape assertions must match the Rift mobile stub (no required `pitch`)
- Caps: binder/want 50

Also add a small `tests/utils/freeLimits.test.js` (or adapt FAB's
`tests/contracts/freeLimits.contract.test.js` without importing contracts) that
asserts refuse-at-50 and Pro bypass for `canAddDistinctCard`.

## Verify

From `/Users/joseescaler/Documents/riftrades`:

```bash
npm test
npm run lint
npm run build
```

Checks:

- [ ] All new tests pass
- [ ] `npm run build` exits 0
- [ ] `rg "binder_entries|binder_shares|get_public_binder|fabtrades-trade-draft|fabtrades\\.net|d2wlb52bya4y8z" src` returns no matches (except possibly comments you should also clean)
- [ ] `rg "rift_binder_entries|rift_binder_shares|get_rift_public_binder|rifttrades-trade-draft" src` finds the ported call sites
- [ ] Migration file exists under
      `/Users/joseescaler/Documents/rifttrades/supabase/migrations/` and has been
      applied on fabloodle
- [ ] Manual: sign in → add a card on `/binder` → same card appears in the
      mobile app binder after sync (both use `rift_binder_entries`)
- [ ] Manual: enable share → open `/b/:token` signed out → entries render →
      Add to trade → navigate to `/` → card is on the want side

## Commit

Web repo:

```bash
git add -A
git commit -m "Add web binder, want list, and shareable binder links"
```

Mobile monorepo (migration + README status):

```bash
git add supabase/migrations/20260802150000_rift_binder_shares.sql docs/port/README.md
git commit -m "Add rift_binder_shares migration and mark Phase 11 done"
```

## Human tasks

| Task | Who |
| --- | --- |
| Confirm production origin for share links / redirect allow-list | Human |
| Apply migration SQL on fabloodle if the implementer cannot | Human |
