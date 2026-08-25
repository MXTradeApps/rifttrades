import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../config/legal_urls.dart';
import '../config/revenuecat_config.dart';

/// Outcome from Apple's native [SubscriptionStoreView].
enum SubscriptionStoreOutcome {
  purchased,
  cancelled,
  unavailable,
}

/// Presents StoreKit's `SubscriptionStoreView` on iOS 17+, which merchandises
/// the Pro subscriptions with App Store localized names, descriptions, prices,
/// auto-renewal terms, and Privacy / Terms of Use buttons.
///
/// Android, the simulator Test Store, and iOS 15–16 fall through so the caller
/// can show RevenueCat's paywall instead.
class SubscriptionStore {
  const SubscriptionStore({MethodChannel? channel})
      : _channel = channel ?? const MethodChannel(_channelName);

  static const _channelName = 'rifttrades/subscription_store';

  static const appleProductIds = [
    'com.rifttrades.app.pro.monthly',
    'com.rifttrades.app.pro.yearly',
  ];

  final MethodChannel _channel;

  /// Whether this build should try the native store rather than a custom
  /// paywall. Reviewers run release/TestFlight on current iOS, so this is the
  /// path that has to satisfy Guideline 3.1.2.
  bool get isSupported {
    if (kIsWeb) return false;
    if (defaultTargetPlatform != TargetPlatform.iOS) return false;
    // Debug uses RevenueCat's Test Store, which StoreKit cannot merchandise.
    return !RevenueCatConfig.useTestStore;
  }

  Future<SubscriptionStoreOutcome> present() async {
    if (!isSupported) return SubscriptionStoreOutcome.unavailable;
    try {
      final raw = await _channel.invokeMethod<String>('present', {
        'productIds': appleProductIds,
        'privacyPolicyUrl': LegalUrls.privacyPolicy,
        'termsOfUseUrl': LegalUrls.termsOfUse,
      });
      return parse(raw);
    } on MissingPluginException {
      return SubscriptionStoreOutcome.unavailable;
    } on PlatformException catch (e) {
      debugPrint('SubscriptionStore: present failed — ${e.message}');
      return SubscriptionStoreOutcome.unavailable;
    }
  }

  @visibleForTesting
  static SubscriptionStoreOutcome parse(String? raw) => switch (raw) {
        'purchased' => SubscriptionStoreOutcome.purchased,
        'cancelled' => SubscriptionStoreOutcome.cancelled,
        _ => SubscriptionStoreOutcome.unavailable,
      };
}
