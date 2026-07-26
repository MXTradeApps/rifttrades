import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/logic/free_limits.dart';
import 'package:rifttrades/core/models/subscription_status.dart';
import 'package:rifttrades/core/models/trade.dart';
import 'package:rifttrades/core/providers.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Device entitlement that never resolves to a value — AsyncError.
class _ErrorSubscription extends SubscriptionNotifier {
  @override
  Future<SubscriptionStatus> build() async {
    throw StateError('device entitlement unavailable');
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<ProviderContainer> makeUnresolvedContainer() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final container = ProviderContainer(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        accountProvider.overrideWith((ref) => Stream.value(null)),
        subscriptionProvider.overrideWith(_ErrorSubscription.new),
        // Force AsyncError even though the real provider swallows fetch errors.
        serverEntitlementProvider.overrideWith(
          (ref) async => throw StateError('server entitlement unavailable'),
        ),
      ],
    );
    addTearDown(container.dispose);

    try {
      await container.read(subscriptionProvider.future);
    } catch (_) {}
    try {
      await container.read(serverEntitlementProvider.future);
    } catch (_) {}

    expect(container.read(subscriptionProvider).hasError, isTrue);
    expect(container.read(serverEntitlementProvider).hasError, isTrue);
    expect(container.read(entitlementResolvedProvider), isFalse);
    expect(container.read(isProProvider), isFalse);
    return container;
  }

  Trade buildTrade(String id) => Trade(id: id, createdAt: DateTime.now());

  test(
    'addTrade does not trim while both entitlement sources are unresolved',
    () async {
      final c = await makeUnresolvedContainer();
      final history = c.read(tradeHistoryProvider.notifier);

      for (var i = 0; i < FreeLimits.savedTrades + 1; i++) {
        expect(
          history.addTrade(buildTrade('t$i')),
          0,
          reason: 'trade $i must not roll anything off',
        );
      }

      expect(
        c.read(tradeHistoryProvider),
        hasLength(FreeLimits.savedTrades + 1),
      );
    },
  );
}
