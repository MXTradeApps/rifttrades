# App Store Review checklist

What to put in App Store Connect before every iOS review submission. FAB Trades
was rejected in July 2026 for a missing Terms of Use (EULA) link and a missing
demo account for the sign-in UI — RiftTrades has the same product shape, so
these must be in place before first submission.

## Legal URLs

| Document | URL |
| --- | --- |
| Privacy Policy | https://rifttrades.net/privacy |
| Terms of Use (EULA) | https://rifttrades.net/terms |

Static source lives in [`apps/legal/`](../apps/legal/). Deploy that directory to
Netlify (or equivalent) and point `rifttrades.net` at it **before** submitting:

```bash
# From repo root, with Netlify CLI linked to the RiftTrades site:
netlify deploy --prod --dir=apps/legal
```

### App Store Connect

1. **App Information → Privacy Policy URL** → `https://rifttrades.net/privacy`
2. **App Information → License Agreement** → either keep Apple’s standard EULA
   **or** paste the custom Terms text / URL for a custom EULA. The hosted page at
   `/terms` is the custom Terms of Use.
3. **Version → Description** — include a functional Terms link (required when
   offering auto-renewable subscriptions). Append something like:

   ```
   Terms of Use (EULA): https://rifttrades.net/terms
   Privacy Policy: https://rifttrades.net/privacy
   ```

4. **Subscriptions** — for each localization of the RiftTrades Pro group /
   products, ensure Privacy Policy and Terms of Use URLs are set if App Store
   Connect shows those fields.
5. **RevenueCat Paywall** — set footer Privacy / Terms links to the same URLs so
   the native paywall also satisfies Guideline 3.1.2.
   - Project: `projc4d5b177` (RiftTrades)
   - Paywall: `pw0036bcb8c9d34e62`
   - Editor: https://app.revenuecat.com/projects/c4d5b177/paywalls/pw0036bcb8c9d34e62/builder
   - Publish the paywall after the footer URLs are set.

Reviewers fetch those URLs — they must return 200 with real content.

## Demo account (required)

The app includes optional sign-in (Apple, Google, Discord, email). App Review’s
automated check requires a username/password demo account in **App Review
Information**.

### One-time setup (production Supabase — fabloodle)

1. Supabase → Authentication → Providers → **Email** → enable.
   - Turn **Confirm email** off for the App Review user (or confirm the address
     yourself) so the reviewer is not blocked on a confirmation mail.
2. Authentication → Users → **Add user**:
   - Email: `appreview@rifttrades.net` (or another address you control)
   - Password: generate a strong password and store it in your password manager
   - Auto Confirm User: on
3. Sign in once on a TestFlight / device build with **Sign in with email** to
   confirm the account works against production.

Do **not** commit the password to git. Put it only in App Store Connect.

### App Review Information fields

| Field | Value |
| --- | --- |
| Sign-in required | Yes (for Pro purchase / sync; core features work signed out) |
| Username | `appreview@rifttrades.net` (or the email you created) |
| Password | *(the password from step 2)* |

### Notes for Review (paste into ASC)

```
RiftTrades can be reviewed without signing in. Core features (card prices,
trade balancing, binder/want list on-device, camera card scanning) work while
signed out.

Sign-in is optional and unlocks cloud sync. Purchasing RiftTrades Pro requires
sign-in so the subscription can be attached to an account.

Demo account (email/password):
- Open My Account (or any Sign in button)
- Tap “Sign in with email”
- Username and password are in the Demo Account fields above

To review RiftTrades Pro:
1. Sign in with the demo account
2. Open My Account → See plans
3. Use a Sandbox Apple ID for the purchase

Legal:
- Terms of Use: https://rifttrades.net/terms
- Privacy Policy: https://rifttrades.net/privacy

Camera: used only for on-device card scanning; frames are not uploaded.
```

## Submit checklist

1. Deploy `apps/legal/` so `/terms` and `/privacy` are live on rifttrades.net.
2. Ship a mobile build that includes Settings → Legal links, subscription legal
   links, and email sign-in.
3. Fill Demo Account + Notes for Review as above.
4. Confirm App Description contains the Terms URL.
5. Set RevenueCat paywall footer URLs and publish the paywall.
6. Submit for review.
