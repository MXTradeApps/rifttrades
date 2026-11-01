/// Temporary product switch: every feature runs unlocked.
///
/// RevenueCat, StoreKit, the paywall, Settings subscription status, and
/// [FreeLimits] stay so a paid tier can return. Set [unlocked] to `false`
/// (or override [featuresUnlockedProvider]) to enforce caps and Pro gates
/// again.
abstract final class FeatureAccess {
  static const unlocked = true;
}
