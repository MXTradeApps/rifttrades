# Phase 3 — Supabase Auth

Add Apple, Google, and Discord sign-in. Nothing syncs yet; this phase only
establishes an account.

Prerequisite: Phase 2 is `Done`.

Paths are relative to `C:\Users\maxes\RiftTrades\apps\mobile` unless stated.
Source paths are relative to `e:\Downlaods\Downloads\fabtrades\apps\mobile`.

## Steps

### 1. Add the dependencies

In `pubspec.yaml`, add to `dependencies`:

```yaml
  sign_in_with_apple: ^7.0.1
  crypto: ^3.0.7
  flutter_svg: ^2.3.0
```

Then:

```powershell
flutter pub get
```

### 2. Copy the source files

Copy each source file to the target path, then apply the rename rules from
`CONVENTIONS.md`. The "Changes" column is the **only** editing needed beyond the
`package:fabtrades/` → `package:rifttrades/` import rewrite.

| Source | Target | Changes |
| --- | --- | --- |
| `lib/core/config/auth_config.dart` | same | `scheme` becomes `'rifttrades'`; update the comment |
| `lib/core/models/account.dart` | same | none |
| `lib/core/data/auth_repository.dart` | same | none |
| `lib/features/auth/auth_provider_icons.dart` | same | none |
| `lib/features/auth/sign_in_sheet.dart` | same | none |
| `lib/features/settings/account_screen.dart` | same | none |
| `lib/features/settings/account_section.dart` | same | remove the sync tile — sync does not exist until Phase 4 |

On `account_section.dart`: the source renders a `_SyncTile` and calls
`syncProvider`. Neither exists yet. Delete that widget and its call site for now;
Phase 4 adds it back. Do not create a stub `syncProvider` to make it compile.

After copying `auth_config.dart`, confirm it reads:

```dart
static const scheme = 'rifttrades';
static const host = 'login-callback';
static const redirectUrl = '$scheme://$host';
```

### 3. Add the auth providers to `lib/core/providers.dart`

Do **not** copy the source `providers.dart`. Add these to the existing file, in
their own clearly commented section. Read the source's lines ~205–243 for the
exact implementations.

- `authRepositoryProvider` — a `Provider<AuthRepository>`; must dispose the
  repository when the provider disposes, or the OAuth listener leaks.
- `accountProvider` — a `StreamProvider<Account?>` mapping
  `authStateChanges` to `Account?`.
- `isSignedInProvider` — a `Provider<bool>` that treats the loading state as
  signed **out**.
- `authProvidersProvider` — a `FutureProvider<List<AuthProviderKind>>`; Apple is
  omitted on Android, so this is async.

### 4. Register the deep link on Android

In `android/app/src/main/AndroidManifest.xml`:

- On the `MainActivity` `<activity>` element, add
  `android:launchMode="singleTask"`. Without it, returning from the browser
  stacks a second activity on top of the first and the app appears to lose state.
- Add a second `<intent-filter>` inside that same activity:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="rifttrades" android:host="login-callback" />
</intent-filter>
```

Leave the existing `MAIN` / `LAUNCHER` intent-filter exactly as it is. The app
needs both.

### 5. Register the deep link on iOS

In `ios/Runner/Info.plist`, add:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>rifttrades</string>
        </array>
    </dict>
</array>
```

### 6. Enable Sign in with Apple on iOS

Create or edit `ios/Runner/Runner.entitlements`:

```xml
<key>com.apple.developer.applesignin</key>
<array>
    <string>Default</string>
</array>
```

If you create the file, it must also be referenced by the Xcode project
(`CODE_SIGN_ENTITLEMENTS` in `ios/Runner.xcodeproj/project.pbxproj`). Check
whether that key is already set. **If it is not set, stop and report** — editing
`project.pbxproj` by hand is easy to corrupt and is better done in Xcode.

### 7. Replace the settings gear with a hamburger and drawer

Source commits `6af57a54` and `69bbe878`. In `lib/app/app.dart`:

- The settings gear becomes a hamburger icon opening an **end** drawer (right
  side, so `endDrawer:` rather than `drawer:`).
- The drawer holds navigation to the account screen and to settings.

RiftTrades' `app.dart` is 138 lines against the source's 198 and they have
diverged. Read both, then edit the RiftTrades one. Do not overwrite it.

### 8. Copy the tests

| Source | Target |
| --- | --- |
| `test/core/data/auth_repository_test.dart` | same |
| `test/models/account_test.dart` | same |
| `test/widgets/account_section_test.dart` | same |

`auth_repository_test.dart` needs `mocktail` (already a dev dependency) and
`url_launcher_platform_interface`. Add to `dev_dependencies`:

```yaml
  url_launcher_platform_interface: ^2.3.2
```

Drop any assertion in `account_section_test.dart` that covers the sync tile you
removed in step 2.

## Verify

```powershell
flutter analyze
flutter test --dart-define-from-file=env/production.json
```

Checks:

- [ ] `flutter analyze` clean
- [ ] Test count went **up** from Phase 2, not down
- [ ] The scheme agrees in all three places:

```powershell
Select-String -Path lib\core\config\auth_config.dart,android\app\src\main\AndroidManifest.xml,ios\Runner\Info.plist -Pattern "rifttrades"
```

  All three files must appear in the output.

- [ ] No `fabtrades` string anywhere in the new files:

```powershell
Select-String -Path lib -Include *.dart -Pattern "fabtrades|FABTrades"
```

  Must return nothing.

- [ ] `singleTask` is set:

```powershell
Select-String -Path android\app\src\main\AndroidManifest.xml -Pattern "singleTask"
```

### Manual check — needs a human

Sign-in cannot be verified from the command line, and it will fail until a human
has enabled the providers and added `rifttrades://login-callback` to the redirect
allow-list on **both** Supabase projects.

If that is not done, report it and mark the phase blocked. Do not conclude the
code is broken.

Once it is done, on a real device or emulator:

1. `flutter run --dart-define-from-file=env/staging.json`
2. Open the drawer, go to the account screen, sign in with Google. The browser
   should open, and **close by itself** on return.
3. Repeat for Discord, and for Apple on an iOS device.
4. Sign out, and confirm local binder data is still there afterwards.

## Commit

```powershell
git add -A
git commit -m "Add Supabase Auth to the mobile app"
```

Set Phase 3 to `Done` in `docs/port/README.md`.
