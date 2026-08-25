# App Store Review checklist

What to put in App Store Connect before every iOS review submission. FAB Trades
was rejected in July 2026 for a missing Terms of Use (EULA) link and a missing
demo account for the sign-in UI — RiftTrades has the same product shape, so
these must be in place before first submission.

## Legal URLs

| Document | URL |
| --- | --- |
| Privacy Policy | https://riftrades.com/privacy |
| Terms of Use (EULA) | https://riftrades.com/terms |

Static source for the legal copy also lives in [`apps/legal/`](../apps/legal/).
The production site at `riftrades.com` serves `/privacy` and `/terms` from the
web app. Those routes must return real document content **before** submitting
— reviewers tap them from Apple's subscription store.

### App Store Connect

1. **App Information → Privacy Policy URL** → `https://riftrades.com/privacy`
2. **App Information → License Agreement** → either keep Apple’s standard EULA
   **or** paste the custom Terms text / URL for a custom EULA. The hosted page at
   `/terms` is the custom Terms of Use.
3. **Version → Description** — include a functional Terms link (required when
   offering auto-renewable subscriptions). Append something like:

   ```
   Terms of Use (EULA): https://riftrades.com/terms
   Privacy Policy: https://riftrades.com/privacy
   ```

4. **Subscriptions** — for each localization of the RiftTrades Pro group /
   products, ensure Privacy Policy and Terms of Use URLs are set if App Store
   Connect shows those fields.
5. **In-app purchase UI** — iOS 17+ presents Apple's `SubscriptionStoreView`,
   which shows localized names, descriptions, prices, auto-renewal terms, and
   Privacy / Terms buttons pointed at the URLs above. Confirm See plans opens
   that store (not a custom paywall missing those links).
6. **RevenueCat Paywall** — Android and older iOS still use this. Set footer
   Privacy / Terms links to the same URLs so that fallback also satisfies
   Guideline 3.1.2.
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
| Sign-in required | No (optional; unlocks cloud sync and Pro on other devices) |
| Username | `appreview@rifttrades.net` (or the email you created) |
| Password | *(the password from step 2)* |

### Notes for Review (paste into ASC)

```
RiftTrades can be reviewed without signing in. Core features (card prices,
trade balancing, binder/want list on-device, camera card scanning) work while
signed out.

Sign-in is optional. It unlocks cloud sync and lets RiftTrades Pro follow the
customer to other devices. It is not required to purchase or use Pro on this
device.

To review RiftTrades Pro:
1. Open My Account → See plans (no sign-in prompt)
2. Apple's subscription store shows monthly/yearly plans with price, period,
   Privacy Policy, and Terms of Use links
3. Subscribe with a Sandbox Apple ID
4. After purchase, an optional “Use Pro on other devices” sheet may appear —
   dismiss it with Not now, or sign in if you want to test sync

A demo account is provided only for testing optional sign-in / sync:
- Open My Account → Sign in → “Sign in with email”
- Username and password are in the Demo Account fields above

Legal:
- Terms of Use: https://riftrades.com/terms
- Privacy Policy: https://riftrades.com/privacy

Camera: used only for on-device card scanning; frames are not uploaded.
```

## Submit checklist

1. Confirm the Paid Apps Agreement is **Active** (Business section), with tax
   and banking filled in. A missing or expired agreement is the usual cause of
   StoreKit error 2 ("There was a problem with the App Store") in sandbox.
2. On this version, attach both subscriptions under **In-App Purchases and
   Subscriptions** before submitting:
   - `com.rifttrades.app.pro.monthly`
   - `com.rifttrades.app.pro.yearly`
3. Deploy the web app so `/terms` and `/privacy` are live on riftrades.com
   with real Terms / Privacy content (not the trade calculator SPA fallback).
4. Ship a mobile build that opens See plans to Apple's SubscriptionStoreView
   (Privacy + Terms buttons on the purchase screen).
5. Paste the Notes for Review above. Sign-in required = **No**. Keep the demo
   account filled in so reviewers can still test optional sync.
6. Confirm App Description contains the Terms URL.
7. Set RevenueCat paywall footer URLs and publish the paywall.
8. Submit for review.
