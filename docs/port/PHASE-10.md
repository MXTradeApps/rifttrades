# Phase 10 — Web foundations and sign-in

Bring the RiftTrades web app up to the prerequisites this morning's FAB features
need: Jest/ESLint tooling, an auth-enabled Supabase client on fabloodle, multi-
provider sign-in, and Pro entitlement reads.

Prerequisite: Phase 9 is `Done`. Read [`WEB-CONVENTIONS.md`](WEB-CONVENTIONS.md)
fully before starting. Do **not** read ahead to Phase 11.

Source: `/Users/joseescaler/Documents/fabtrades/apps/web`
Target: `/Users/joseescaler/Documents/riftrades`

Never write to the source repo. Never overwrite files listed under "Never
overwrite" in `WEB-CONVENTIONS.md`.

## Steps

### 1. Confirm fabloodle has catalog data

Before changing the client, verify fabloodle has rows the web catalog loader
needs. From any machine with network access to Supabase, query fabloodle
(`cnmxaccamqshgvesieez`):

- `select count(*) from cards;` — must be > 0
- `select count(*) from card_prices;` — must be > 0

If either is 0, ** and report. Do not point the web app at an empty project.

### 2. Add Jest / Babel / ESLint scaffolding

Copy these files from the source into the target (same relative paths under the
web app root):

| Source | Target |
| --- | --- |
| `jest.config.js` | `jest.config.js` |
| `babel.config.cjs` | `babel.config.cjs` |
| `eslint.config.js` | `eslint.config.js` |
| `src/setupTests.js` | `src/setupTests.js` |
| `__mocks__/fileMock.js` | `__mocks__/fileMock.js` |

In target `jest.config.js`, trim `collectCoverageFrom` to modules that exist in
riftrades today (at minimum leave an empty array or only paths that exist —
`setSlug.js` / `tradeItems.js` may be absent). Keep `testMatch` as
`<rootDir>/tests/**/*.{js,jsx,ts,tsx}`. Create an empty `tests/.gitkeep` if no
tests land in this phase yet.

### 3. Update `package.json` scripts and devDependencies

In target `package.json`, **add** (do not remove existing CSV scripts or
`papaparse` / `csv-parser`):

Scripts:

```json
"lint": "eslint .",
"test": "jest",
"test:watch": "jest --watch",
"test:ci": "jest --ci --coverage --watchAll=false"
```

DevDependencies — copy the versions from source `package.json`:

- `@babel/preset-env`
- `@babel/preset-react`
- `@eslint/js`
- `@testing-library/jest-dom`
- `@testing-library/react`
- `@testing-library/user-event`
- `eslint`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`
- `globals`
- `identity-obj-proxy`
- `jest`
- `jest-environment-jsdom`

Run `npm install` in the target repo.

### 4. Rewrite `src/lib/supabase.js` for fabloodle + auth

Hand-merge. The target currently hard-codes `tenrvaghaspwdvnwvgrh` and disables
auth (`persistSession: false`). Change it to:

1. Default URL: `https://cnmxaccamqshgvesieez.supabase.co`
2. Default anon/publishable key: `sb_publishable_4hW7qDSTmCljfKl-dB43kQ_xSk0JFom`
   (also overridable via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`)
3. Auth options matching source:

```js
auth: {
  redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
}
```

You may keep the simple always-create-client shape the target has today (source
uses `config/env.js` and may export `null` — that pattern is optional). If you
copy `src/config/env.js`, adapt it so defaults are fabloodle, not empty, and so
local `npm run build` still works without Netlify env vars.

Update target `.env.example` if it exists so the documented defaults are
fabloodle.

**Do not** change `src/services/supabaseCardData.js` — it already queries
`cards` / `card_prices` / `sets`, which is correct for fabloodle.

### 5. Port auth + entitlement modules

Copy from source, applying brand renames from `WEB-CONVENTIONS.md`:

| Source | Target action |
| --- | --- |
| `src/contexts/AuthContext.jsx` | Copy verbatim (no FAB brand strings expected) |
| `src/components/auth/LoginButton.jsx` | Copy; rename any FAB product strings |
| `src/components/auth/SignInDialog.jsx` | Copy; rename any FAB product strings |
| `src/services/entitlements.js` | Copy; change `.from('entitlements')` → `.from('rift_entitlements')` |
| `src/contexts/EntitlementContext.jsx` | Copy verbatim |

`AuthContext` must expose (as in source): `user`, `session`, `loading`,
`authError`, `clearAuthError`, `signInWithProvider`, `signInWithEmail`,
`signUpWithEmail`, `signOut`, and keep any deprecated `signInWithDiscord`
wrapper if present. Providers: `discord`, `google`, `apple` via
`signInWithOAuth` with `redirectTo: window.location.origin`. Email uses
password sign-in / sign-up — **no** magic link.

### 6. Wire providers into the app shell

Target today puts `BrowserRouter` in `src/main.jsx` and a bare `Routes` in
`src/App.jsx`. Keep that split (do not move the router into `App.jsx` unless you
also update every import). Hand-merge:

**`src/App.jsx`** — wrap routes with providers:

```jsx
import { AuthProvider } from './contexts/AuthContext.jsx';
import { EntitlementProvider } from './contexts/EntitlementContext.jsx';

function App() {
  return (
    <AuthProvider>
      <EntitlementProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
        </Routes>
      </EntitlementProvider>
    </AuthProvider>
  );
}
```

Do **not** add `/binder`, `/wants`, `/b/:token`, or `/history` yet — that is
Phase 11 / 12.

**`src/main.jsx`** — leave `ThemeModeProvider` / `PriceProvider` /
`CardDataProvider` / `BrowserRouter` as they are. Providers that need auth stay
inside `App`.

### 7. Hand-merge sign-in into `Header.jsx`

Read target `src/components/elements/Header.jsx` first. It has:

- Teal/gold AppBar styling
- Hamburger drawer with set browsing via `onNavigate`
- Theme toggle
- **No** LoginButton

Take from source Header **only**:

- Import and render `LoginButton` on the right (near the theme toggle)
- Keep all existing set-drawer / `onNavigate` behaviour
- Keep teal/gold colours — do **not** import FAB brand palette tokens
- Do **not** add Trade Calculator / My Binder nav buttons yet (Phase 11)

### 8. Smoke-test auth locally (manual)

```bash
npm run dev
```

Open `http://localhost:5173`. Confirm:

- Catalog still loads (cards searchable on Home)
- Sign-in dialog opens from the header button
- OAuth buttons are present (Discord, Google, Apple)
- Email fields are present

A full OAuth round-trip may fail until a human adds
`http://localhost:5173/**` to fabloodle's redirect allow-list — that is a
blocker to report, not something to work around in code.

## Verify

From `/Users/joseescaler/Documents/riftrades`:

```bash
npm test
npm run lint
npm run build
```

Checks:

- [ ] `npm test` exits 0 (may be zero tests — that is fine this phase)
- [ ] `npm run lint` exits 0, or only pre-existing issues in untouched files
- [ ] `npm run build` exits 0
- [ ] `src/lib/supabase.js` defaults to `cnmxaccamqshgvesieez`, not
      `tenrvaghaspwdvnwvgrh`
- [ ] `persistSession: true` (and auto-refresh / detectSessionInUrl) are set
- [ ] `entitlements.js` queries `rift_entitlements` only — no bare `entitlements`
- [ ] No `fabtrades` / `FABTrades` / `FAB Trades` strings under `src/`
- [ ] `supabaseCardData.js`, `useCardData.jsx`, `PriceContext.jsx`,
      `ThemeContext.jsx`, `SetView.jsx`, `FindFillerDialog.jsx` were not
      wholesale-replaced
- [ ] Header still browsets sets via `onNavigate` and still uses teal/gold

## Commit

In the **web** repo (`/Users/joseescaler/Documents/riftrades`):

```bash
git add -A
git commit -m "Add web auth, entitlements, and fabloodle Supabase client"
```

In the **mobile monorepo**, set Phase 10 to `Done` in `docs/port/README.md`
(separate small commit is fine):

```bash
git add docs/port/README.md
git commit -m "Mark port Phase 10 done"
```

## Human tasks that may block Verify

| Task | Who |
| --- | --- |
| Enable Google, Discord, Apple, and email on fabloodle Auth | Human |
| Add `http://localhost:5173` and `http://localhost:5173/**` to fabloodle redirect URLs | Human |
| Add the production Netlify origin (and `/**`) to redirect URLs | Human (need the domain) |
| Point Netlify env `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` at fabloodle, or clear them so code defaults apply | Human |

If OAuth cannot complete because providers/redirects are missing, still commit
the code once automated Verify passes, and report the human tasks as outstanding
in the README human-tasks table.
