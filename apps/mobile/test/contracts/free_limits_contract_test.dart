// Contract tests for multi-Binder free-tier caps.
//
// Loads `free_limits_binders` — the same golden fixture web uses. Want List
// stays 25 on mobile; do not pin wantListCards against this fixture.
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/logic/free_limits.dart';
import 'package:rifttrades/core/models/binder.dart';
import 'package:rifttrades/core/models/subscription_status.dart';
import 'package:rifttrades/core/providers.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../support/fixtures.dart';
import 'contract_fixtures.dart';

class _FakeSubscription extends SubscriptionNotifier {
  _FakeSubscription({required this.isPro});

  final bool isPro;

  @override
  Future<SubscriptionStatus> build() async =>
      isPro ? const SubscriptionStatus(isPro: true) : SubscriptionStatus.free;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final contract = loadContract('free_limits_binders');
  final limits = Map<String, dynamic>.from(contract['limits'] as Map);
  final cases = contractCases(contract, 'cases');

  Future<ProviderContainer> makeContainer({required bool isPro}) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final container = ProviderContainer(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        subscriptionProvider.overrideWith(() => _FakeSubscription(isPro: isPro)),
      ],
    );
    addTearDown(container.dispose);
    await container.read(subscriptionProvider.future);
    return container;
  }

  group('free_limits_binders contract', () {
    test('agrees with the shared multi-Binder caps', () {
      expect(limits['binderCards'], 50);
      expect(limits['binders'], 4);
      expect(FreeLimits.binderCards, limits['binderCards']);
      expect(FreeLimits.binders, limits['binders']);
    });

    for (final testCase in cases.where((c) => c['limit'] == 'binders')) {
      test(testCase['name'] as String, () {
        expect(
          FreeLimits.canCreateBinder(
            testCase['existing'] as int,
            isPro: testCase['isPro'] as bool? ?? false,
          ),
          testCase['allowed'],
        );
      });
    }

    for (final testCase in cases.where((c) => c['limit'] == 'binderCards')) {
      test(testCase['name'] as String, () async {
        final action = testCase['action'] as String;
        if (action == 'same-printing-two-binders') {
          final container = await makeContainer(isPro: false);
          final binder = container.read(binderProvider.notifier);
          final card = buildCard(id: 'shared');
          expect(binder.add(card, binderId: BinderIds.trade), isTrue);
          expect(binder.add(card, binderId: BinderIds.collection), isTrue);
          final entries = container.read(binderProvider);
          expect(
            entries
                .where((e) =>
                    !e.isWanted && e.resolvedBinderId == BinderIds.trade)
                .map((e) => e.card.id)
                .toSet(),
            hasLength(testCase['tradeDistinct'] as int),
          );
          expect(
            entries
                .where((e) =>
                    !e.isWanted && e.resolvedBinderId == BinderIds.collection)
                .map((e) => e.card.id)
                .toSet(),
            hasLength(testCase['collectionDistinct'] as int),
          );
          expect(testCase['countsAsOneInEach'], isTrue);
          return;
        }

        final destCount = testCase['destinationDistinct'] as int;
        final alreadyInDest = testCase['printingAlreadyInDestination'] as bool;
        final isPro = testCase['isPro'] as bool? ?? false;

        if (action == 'quantity-up') {
          expect(
            alreadyInDest ||
                FreeLimits.canAddDistinctCard(
                  destCount,
                  isWanted: false,
                  isPro: isPro,
                ),
            testCase['allowed'],
          );
          final container = await makeContainer(isPro: isPro);
          final binder = container.read(binderProvider.notifier);
          for (var i = 0; i < destCount; i++) {
            expect(
              binder.add(buildCard(id: 'col-$i'), binderId: BinderIds.collection),
              isTrue,
            );
          }
          expect(
            binder.add(buildCard(id: 'col-0'), binderId: BinderIds.collection),
            testCase['allowed'],
          );
          return;
        }

        if (action == 'move-in-new') {
          expect(
            FreeLimits.canAddDistinctCard(
              destCount,
              isWanted: false,
              isPro: isPro,
            ),
            testCase['allowed'],
          );
          final container = await makeContainer(isPro: isPro);
          final binder = container.read(binderProvider.notifier);
          for (var i = 0; i < destCount; i++) {
            expect(
              binder.add(buildCard(id: 'col-$i'), binderId: BinderIds.collection),
              isTrue,
            );
          }
          expect(
            binder.add(
              buildCard(id: 'from-trade'),
              binderId: BinderIds.collection,
            ),
            testCase['allowed'],
          );
        }
      });
    }
  });
}
