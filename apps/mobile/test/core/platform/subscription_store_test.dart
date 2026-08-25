import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/platform/subscription_store.dart';

void main() {
  test('parses native store outcomes', () {
    expect(
      SubscriptionStore.parse('purchased'),
      SubscriptionStoreOutcome.purchased,
    );
    expect(
      SubscriptionStore.parse('cancelled'),
      SubscriptionStoreOutcome.cancelled,
    );
    expect(
      SubscriptionStore.parse('unavailable'),
      SubscriptionStoreOutcome.unavailable,
    );
    expect(SubscriptionStore.parse(null), SubscriptionStoreOutcome.unavailable);
  });

  test('present reports unavailable when the plugin is missing', () async {
    TestWidgetsFlutterBinding.ensureInitialized();
    const channel = MethodChannel('rifttrades/subscription_store');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);

    final outcome = await const SubscriptionStore(channel: channel).present();
    expect(outcome, SubscriptionStoreOutcome.unavailable);
  });
}
