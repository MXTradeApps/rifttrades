# Price alerts

On a card's detail page, a signed-in user can ask to be told when that printing
**rises to** or **drops to** a price. Their alerts are listed under **More → Price
Alerts**, fired ones first. Ported from FAB Trades, which has the same feature.

## How it works

```
card detail ──insert──▶ rift_price_alerts (RLS: own rows)
                                │
update-prices.yml: ingest ──▶ price-alerts Edge Function
                                ├─ rift_fire_price_alerts()   stamps triggered_at
                                └─ FCM push to rift_push_tokens, then notified_at
```

- **Which price.** The alert stores the marketplace the user had selected when they
  set it (`tcgplayer` → TCGplayer market in USD, `cardmarket` → CardMarket trend in
  EUR, the foil trend for a foil printing). The comparison in
  `rift_fire_price_alerts` uses the same fallbacks as the app's `Pricing.value`, so
  the number in the notification is the number on the card page.
- **When.** Prices update once a day (06:00 UTC), so alerts are checked once a day,
  right after the ingest.
- **Once.** An alert fires once and stays in the list as *Hit*. *Watch again*
  re-arms it.
- **Delivery is retried, firing is not.** Firing is a single SQL statement. The push
  step reads every fired alert without `notified_at` from the last three days, so a
  failed push is retried on the next run, and an alert older than that is not
  pushed at all (it still shows in the app).
- **More than three alerts** for one person in one run become a single summary push.
- **Signed out**: alerts need an account, because the server fires them. The sheet
  asks the user to sign in first.
- Each user can have at most 200 alerts (a trigger enforces it).

Rift has no analytics provider, so unlike FAB Trades nothing is captured.

## Setup

Without any of this, the feature still works in the app once the migration is
applied: alerts are created and listed, and they show as *Hit* once the function
runs. Push is the part that needs Firebase.

1. **Database.** Apply `supabase/migrations/20261026120000_rift_price_alerts.sql`
   to production (the `fabloodle` project).
2. **Firebase project.** Create one for Rift Trades, add an iOS app
   (bundle id `com.rifttrades.rifttrades`) and an Android app (package
   `com.rifttrades.myapp`).
   - iOS: upload an APNs auth key (Project settings → Cloud Messaging), turn on
     the Push Notifications capability for the App ID, and add `aps-environment`
     to `Runner.entitlements` (left out while push is off, so builds don't need
     the capability).
   - Copy the app ids, API keys, sender id and project id into
     `apps/mobile/env/production.json`:
     ```json
     "FIREBASE_PROJECT_ID": "...",
     "FIREBASE_MESSAGING_SENDER_ID": "...",
     "FIREBASE_ANDROID_API_KEY": "...",
     "FIREBASE_ANDROID_APP_ID": "1:...:android:...",
     "FIREBASE_IOS_API_KEY": "...",
     "FIREBASE_IOS_APP_ID": "1:...:ios:...",
     "FIREBASE_IOS_BUNDLE_ID": "com.rifttrades.rifttrades"
     ```
     These are client identifiers and safe to commit, like the Supabase publishable
     key. No `google-services.json` / `GoogleService-Info.plist` is needed.
3. **Edge Function.**
   ```sh
   supabase secrets set PRICE_ALERTS_SECRET=$(openssl rand -hex 32)
   supabase secrets set FCM_SERVICE_ACCOUNT="$(cat firebase-service-account.json)"
   supabase functions deploy price-alerts
   ```
   The service account comes from Firebase → Project settings → Service accounts →
   Generate new private key.
4. **GitHub.** Add the `PRICE_ALERTS_SECRET` repository secret (same value).
   `SUPABASE_FUNCTIONS_URL` already exists for reconcile-entitlements. Until both
   are set, the step in `update-prices.yml` skips itself.
5. **iOS pods.** The app now builds every plugin with CocoaPods
   (`enable-swift-package-manager: false` in `pubspec.yaml`), because Firebase over
   SPM and ML Kit over CocoaPods link GoogleDataTransport twice. The next
   `flutter build ipa` on the Mac runs `pod install` and updates `Podfile.lock`;
   commit that change.
