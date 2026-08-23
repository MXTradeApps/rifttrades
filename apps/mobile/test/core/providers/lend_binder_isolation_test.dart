import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/logic/binder_cover.dart';
import 'package:rifttrades/core/logic/binder_value_snapshot.dart';
import 'package:rifttrades/core/models/binder.dart';
import 'package:rifttrades/core/models/subscription_status.dart';
import 'package:rifttrades/core/providers.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../support/fixtures.dart';

class _FreeSubscription extends SubscriptionNotifier {
  @override
  Future<SubscriptionStatus> build() async => SubscriptionStatus.free;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<ProviderContainer> makeContainer() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final container = ProviderContainer(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        subscriptionProvider.overrideWith(_FreeSubscription.new),
      ],
    );
    addTearDown(container.dispose);
    await container.read(subscriptionProvider.future);
    return container;
  }

  List<BinderValueRow> overlayInput(ProviderContainer c, String binderId) {
    return [
      for (final e in c.read(binderProvider))
        if (!e.isWanted && e.resolvedBinderId == binderId && e.quantity > 0)
          BinderValueRow.fromBinderEntry(e),
    ];
  }

  test('lend-group mutations do not change Binder membership, counts, or overlay input',
      () async {
    final c = await makeContainer();
    final binder = c.read(binderProvider.notifier);
    binder.add(
      buildCard(id: 'owned-1', name: 'Owned', tcgMarket: 4),
      binderId: BinderIds.trade,
    );
    binder.add(
      buildCard(id: 'keep-1', name: 'Keep', tcgMarket: 2),
      binderId: BinderIds.collection,
    );

    final beforeEntries = c.read(binderProvider);
    final beforeTradeCount = beforeEntries
        .where((e) => !e.isWanted && e.resolvedBinderId == BinderIds.trade)
        .fold<int>(0, (s, e) => s + e.quantity);
    final beforeOverlay = overlayInput(c, BinderIds.trade);
    final beforeCover = pickBinderCover(beforeOverlay);

    final lend = c.read(lendProvider.notifier);
    final groupId = lend.createGroup(isBorrowing: false);
    expect(lend.addCard(groupId, buildCard(id: 'lent-1')), isTrue);

    final afterEntries = c.read(binderProvider);
    expect(afterEntries.map((e) => '${e.card.id}|${e.resolvedBinderId}|${e.quantity}'),
        beforeEntries.map((e) => '${e.card.id}|${e.resolvedBinderId}|${e.quantity}'));
    expect(
      afterEntries
          .where((e) => !e.isWanted && e.resolvedBinderId == BinderIds.trade)
          .fold<int>(0, (s, e) => s + e.quantity),
      beforeTradeCount,
    );
    expect(overlayInput(c, BinderIds.trade).length, beforeOverlay.length);
    expect(pickBinderCover(overlayInput(c, BinderIds.trade)).printingId,
        beforeCover.printingId);
    expect(
      buildBinderValueSnapshot(overlayInput(c, BinderIds.trade)).copies,
      buildBinderValueSnapshot(beforeOverlay).copies,
    );
  });

  test('Binder move and add do not change lend groups', () async {
    final c = await makeContainer();
    final lend = c.read(lendProvider.notifier);
    final groupId = lend.createGroup(isBorrowing: false);
    lend.addCard(groupId, buildCard(id: 'lent-keep'), quantity: 2);
    final beforeLend = c.read(lendProvider);

    final binder = c.read(binderProvider.notifier);
    binder.add(
      buildCard(id: 'move-me', name: 'Mover', tcgMarket: 3),
      quantity: 3,
      binderId: BinderIds.trade,
    );
    final moved = binder.moveCopies(
      printingId: 'move-me',
      fromBinderId: BinderIds.trade,
      toBinderId: BinderIds.collection,
      quantity: 2,
    );
    expect(moved.ok, isTrue);

    final afterLend = c.read(lendProvider);
    expect(afterLend.length, beforeLend.length);
    expect(afterLend.single.id, beforeLend.single.id);
    expect(afterLend.single.items.single.card.id, 'lent-keep');
    expect(afterLend.single.items.single.quantity, 2);
  });
}
