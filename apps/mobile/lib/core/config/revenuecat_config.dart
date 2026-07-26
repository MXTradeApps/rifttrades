import 'package:flutter/foundation.dart';

/// RevenueCat wiring for RiftTrades Pro.
///
/// The identifiers below must match the RevenueCat dashboard exactly:
///
/// * Entitlement — `RiftTrades Pro` (Product catalog → Entitlements)
/// * Offering    — one offering marked **Current**, with every platform's yearly
///   product attached to `$rc_annual` and every monthly product to `$rc_monthly`
///   (Product catalog → Offerings)
///
/// ## API keys
///
/// Debug and profile builds use the [RevenueCat Test Store][test-store], which
/// simulates purchases without any App Store / Play Console setup. Its key is
/// passed at build time via `--dart-define=REVENUECAT_TEST_STORE_API_KEY=…`
/// rather than committed here — a hardcoded Test Store key would belong to
/// another product's RevenueCat project and would bind RiftTrades users into
/// that customer list. Release builds require the real platform keys:
///
/// ```sh
/// flutter build appbundle \
///   --dart-define=REVENUECAT_GOOGLE_API_KEY=goog_xxx
/// flutter build ipa \
///   --dart-define=REVENUECAT_APPLE_API_KEY=appl_xxx
/// ```
///
/// If any build is missing its key, [apiKey] returns null and the app runs
/// with subscriptions disabled rather than crashing — never against another
/// product's project.
///
/// [test-store]: https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store
class RevenueCatConfig {
  const RevenueCatConfig._();

  /// Entitlement identifier that unlocks Pro features.
  static const proEntitlement = 'RiftTrades Pro';

  /// Every store identifier that means "the yearly plan".
  ///
  /// A set rather than one string, because the identifier genuinely cannot be the
  /// same everywhere: Apple requires product ids to be unique across the entire
  /// developer account (which this app shares with another product), Play scopes
  /// them to the app and reports them as `subscription:base_plan`, and the Test
  /// Store has its own. Matching against all of them keeps one list to maintain
  /// instead of a per-platform branch.
  ///
  /// Only a fallback: packages normally resolve by [PackageType], which is what
  /// attaching them to the `$rc_annual` / `$rc_monthly` slots gives you.
  static const yearlyProductIds = {
    'com.rifttrades.rifttrades.pro.yearly', // App Store
    'pro_yearly', // Play Store, base plan appended
    'yearly', // Test Store
  };

  /// Every store identifier that means "the monthly plan". See
  /// [yearlyProductIds] for why there is more than one.
  static const monthlyProductIds = {
    'com.rifttrades.rifttrades.pro.monthly', // App Store
    'pro_monthly', // Play Store, base plan appended
    'monthly', // Test Store
  };

  /// Test Store key from `--dart-define=REVENUECAT_TEST_STORE_API_KEY`. Empty
  /// when the define is absent; [apiKey] then returns null so subscriptions
  /// stay off instead of pointing at the wrong RevenueCat project.
  static const _testStoreApiKey =
      String.fromEnvironment('REVENUECAT_TEST_STORE_API_KEY');

  static const _appleApiKey =
      String.fromEnvironment('REVENUECAT_APPLE_API_KEY');
  static const _googleApiKey =
      String.fromEnvironment('REVENUECAT_GOOGLE_API_KEY');

  /// True when purchases should go through the Test Store instead of a real
  /// store. Set `--dart-define=REVENUECAT_USE_TEST_STORE=true` to opt a
  /// release build in as well (for a QA/TestFlight build, for example).
  static const useTestStore =
      !kReleaseMode || bool.fromEnvironment('REVENUECAT_USE_TEST_STORE');

  /// The key to configure the SDK with, or null when this build has no usable
  /// key and subscriptions should stay switched off.
  static String? apiKey({TargetPlatform? platform}) {
    // Web purchases need a separate Web Billing key and are not set up yet.
    if (kIsWeb) return null;
    if (useTestStore) {
      return _testStoreApiKey.isEmpty ? null : _testStoreApiKey;
    }
    final key = switch (platform ?? defaultTargetPlatform) {
      TargetPlatform.iOS || TargetPlatform.macOS => _appleApiKey,
      TargetPlatform.android => _googleApiKey,
      _ => '',
    };
    return key.isEmpty ? null : key;
  }
}
