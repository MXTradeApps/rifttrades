import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/models/binder.dart';
import 'package:rifttrades/core/models/binder_entry.dart';
import 'package:rifttrades/core/providers.dart';
import 'package:rifttrades/features/search/home_dashboard.dart';
import 'package:rifttrades/features/search/search_screen.dart';

import '../support/fixtures.dart';
import '../support/harness.dart';

BinderEntry owned(String id, {int qty = 1, DateTime? at, String? binder}) =>
    BinderEntry(
      card: buildCard(id: id, name: 'Card $id', tcgMarket: 10, tcgLow: 9),
      quantity: qty,
      addedAt: at ?? DateTime(2026, 10, 1),
      binderId: binder ?? BinderIds.trade,
    );

void main() {
  // Browse only renders its sliver list (and so the dashboard) once the
  // catalog has at least one set.
  final catalog = [buildCard(id: 'set-card', name: 'Set Card')];

  group('collection math', () {
    test('copies are summed per printing across Binders, Want List excluded',
        () {
      final copies = ownedCopiesByPrinting([
        owned('a', qty: 2),
        owned('a', binder: BinderIds.collection),
        owned('b'),
        BinderEntry(
          card: buildCard(id: 'want'),
          isWanted: true,
          addedAt: DateTime(2026, 10, 12),
        ),
      ]);
      expect(copies, {'a': 3, 'b': 1});
    });

    test('recently added is newest first, one per printing, owned only', () {
      final rows = recentlyAdded([
        owned('old', at: DateTime(2026, 9, 1)),
        owned('new', at: DateTime(2026, 10, 10)),
        owned('new', at: DateTime(2026, 10, 9), binder: BinderIds.collection),
        BinderEntry(
          card: buildCard(id: 'want'),
          isWanted: true,
          addedAt: DateTime(2026, 10, 12),
        ),
      ]);
      expect(rows.map((e) => e.card.id), ['new', 'old']);
    });
  });

  testWidgets('empty collection shows a start prompt', (tester) async {
    await pumpApp(tester, const BrowseScreen(), catalog: catalog);
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('homeStartCollection')), findsOneWidget);
    expect(find.byKey(const Key('homeCollectionSummary')), findsNothing);
  });

  testWidgets('owned cards show value and recents', (tester) async {
    final container =
        await pumpApp(tester, const BrowseScreen(), catalog: catalog);
    container.read(binderProvider.notifier).add(
          buildCard(id: 'alpha', name: 'Alpha', tcgMarket: 15, tcgLow: 14),
          quantity: 2,
          binderId: BinderIds.trade,
        );
    await tester.pump();
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('homeCollectionSummary')), findsOneWidget);
    expect(
      tester.widget<Text>(find.byKey(const Key('homeCollectionValue'))).data,
      '\$30.00',
    );
    expect(find.text('2 cards · 2 binders'), findsOneWidget);
    expect(find.byKey(const Key('homeRecent-alpha')), findsOneWidget);
  });

  testWidgets('summary asks the shell to open the Binder tab', (tester) async {
    final container =
        await pumpApp(tester, const BrowseScreen(), catalog: catalog);
    container.read(binderProvider.notifier).add(
          buildCard(id: 'alpha', name: 'Alpha', tcgMarket: 15),
          binderId: BinderIds.trade,
        );
    container.read(openBinderIdProvider.notifier).open(BinderIds.trade);
    await tester.pump();
    await tester.pumpAndSettle();

    final requests = <int?>[];
    container.listen<int?>(shellTabProvider, (_, next) => requests.add(next));
    await tester.tap(find.byKey(const Key('homeCollectionSummary')));
    await tester.pump();

    expect(requests, contains(binderTabIndex));
    expect(container.read(openBinderIdProvider), isNull);
  });
}
