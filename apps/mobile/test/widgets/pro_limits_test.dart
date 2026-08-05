import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:rifttrades/core/data/card_repository.dart';
import 'package:rifttrades/core/logic/free_limits.dart';
import 'package:rifttrades/core/models/account.dart';
import 'package:rifttrades/core/models/card_model.dart';
import 'package:rifttrades/core/models/subscription_status.dart';
import 'package:rifttrades/core/providers.dart';
import 'package:rifttrades/features/paywall/pro_limits.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../support/fixtures.dart';
import '../support/sync_stub.dart';

class _FakeSubscription extends SubscriptionNotifier {
  _FakeSubscription({required this.isPro});

  final bool isPro;

  @override
  Future<SubscriptionStatus> build() async =>
      isPro ? const SubscriptionStatus(isPro: true) : SubscriptionStatus.free;
}

class MockCardRepository extends Mock implements CardRepository {}

/// Minimal surface that exercises [addToBinderOrUpsell] the same way every
/// "Add to Binder" entry point does.
class _AddButton extends ConsumerWidget {
  const _AddButton({required this.card});

  final CardModel card;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: TextButton(
        onPressed: () => addToBinderOrUpsell(context, ref, card),
        child: const Text('Add'),
      ),
    );
  }
}

Future<({ProviderContainer container, StubSyncNotifier sync})> _pumpAddButton(
  WidgetTester tester, {
  required bool isPro,
  Account? account,
}) async {
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final mockRepo = MockCardRepository();
  when(() => mockRepo.fetchAll()).thenAnswer((_) async => []);
  final sync = StubSyncNotifier();

  final container = ProviderContainer(
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      cardRepositoryProvider.overrideWithValue(mockRepo),
      accountProvider.overrideWithValue(AsyncValue.data(account)),
      syncProvider.overrideWith(() => sync),
      subscriptionProvider.overrideWith(() => _FakeSubscription(isPro: isPro)),
      serverEntitlementProvider.overrideWith((ref) async => null),
    ],
  );
  addTearDown(container.dispose);

  await container.read(subscriptionProvider.future);
  expect(container.read(isProProvider), isPro);

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(home: _AddButton(card: buildCard(id: 'new-card'))),
    ),
  );
  await tester.pumpAndSettle();
  return (container: container, sync: sync);
}

void main() {
  testWidgets(
    'free user at binder cap sees Upgrade snackbar and no card is added',
    (tester) async {
      final (:container, sync: _) = await _pumpAddButton(tester, isPro: false);
      final binder = container.read(binderProvider.notifier);

      for (var i = 0; i < FreeLimits.binderCards; i++) {
        expect(binder.add(buildCard(id: 'card-$i')), isTrue);
      }
      expect(container.read(binderProvider), hasLength(FreeLimits.binderCards));

      await tester.tap(find.text('Add'));
      await tester.pumpAndSettle();

      expect(find.text('Upgrade'), findsOneWidget);
      expect(
        find.text(
          'Binders hold ${FreeLimits.binderCards} cards on the free plan.',
        ),
        findsOneWidget,
      );
      expect(container.read(binderProvider), hasLength(FreeLimits.binderCards));
      expect(
        container.read(binderProvider).any((e) => e.card.id == 'new-card'),
        isFalse,
      );
    },
  );

  testWidgets(
    'Pro user at the same count adds successfully with no snackbar',
    (tester) async {
      final (:container, sync: _) = await _pumpAddButton(tester, isPro: true);
      final binder = container.read(binderProvider.notifier);

      for (var i = 0; i < FreeLimits.binderCards; i++) {
        expect(binder.add(buildCard(id: 'card-$i')), isTrue);
      }
      expect(container.read(binderProvider), hasLength(FreeLimits.binderCards));

      await tester.tap(find.text('Add'));
      await tester.pumpAndSettle();

      expect(find.text('Upgrade'), findsNothing);
      expect(
        find.text(
          'Binders hold ${FreeLimits.binderCards} cards on the free plan.',
        ),
        findsNothing,
      );
      expect(
        container.read(binderProvider),
        hasLength(FreeLimits.binderCards + 1),
      );
      expect(
        container.read(binderProvider).any((e) => e.card.id == 'new-card'),
        isTrue,
      );
    },
  );

  testWidgets(
    'signed-in add queues a binder sync',
    (tester) async {
      final (:container, :sync) = await _pumpAddButton(
        tester,
        isPro: true,
        account: const Account(id: 'user-1'),
      );

      await tester.tap(find.text('Add'));
      await tester.pumpAndSettle();

      expect(
        container.read(binderProvider).any((e) => e.card.id == 'new-card'),
        isTrue,
      );
      expect(sync.requested, ['user-1']);
    },
  );

  testWidgets(
    'signed-out add does not queue a sync',
    (tester) async {
      final (:container, :sync) = await _pumpAddButton(tester, isPro: true);

      await tester.tap(find.text('Add'));
      await tester.pumpAndSettle();

      expect(
        container.read(binderProvider).any((e) => e.card.id == 'new-card'),
        isTrue,
      );
      expect(sync.requested, isEmpty);
    },
  );
}
