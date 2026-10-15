import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/logic/recent_movers.dart';
import 'package:rifttrades/features/card_detail/card_detail_screen.dart';
import 'package:rifttrades/features/search/search_screen.dart';

import '../support/fixtures.dart';
import '../support/harness.dart';

RecentMoverRow mover({
  required String direction,
  int rank = 1,
  String cardId = 'aaa-normal',
  String name = 'Jinx, Loose Cannon',
  String setName = 'Origins',
  String finish = 'Foil',
  double startLow = 4,
  String startOn = '2026-10-11',
  double latestLow = 6,
  double percentChange = 0.5,
  double amountChange = 2,
}) =>
    RecentMoverRow(
      direction: direction,
      rank: rank,
      cardId: cardId,
      name: name,
      setName: setName,
      finish: finish,
      startLow: startLow,
      startOn: startOn,
      latestLow: latestLow,
      percentChange: percentChange,
      amountChange: amountChange,
    );

void main() {
  final jinx = buildCard(
    id: 'aaa-normal',
    name: 'Jinx, Loose Cannon',
    setName: 'Origins',
    subTypeName: 'Foil',
    tcgLow: 6,
  );
  final unowned = buildCard(
    id: 'hot-unowned',
    name: 'Hot Catalog Card',
    setName: 'Origins',
  );
  final catalog = [jinx, unowned];

  final gainer = mover(direction: 'gainer');
  final loser = mover(
    direction: 'loser',
    cardId: 'hot-unowned',
    name: 'Hot Catalog Card',
    finish: 'Normal',
    startLow: 8,
    latestLow: 4,
    percentChange: -0.5,
    amountChange: -4,
  );

  Future<void> settle(WidgetTester tester) async {
    await tester.pump();
    await tester.pumpAndSettle();
  }

  Future<void> openTrending(WidgetTester tester) async {
    await tester.tap(find.byKey(const Key('seeTrending')));
    await tester.pumpAndSettle();
  }

  testWidgets('Browse shows See Trending, not the movers themselves',
      (tester) async {
    await pumpApp(
      tester,
      const BrowseScreen(),
      catalog: catalog,
      recentMovers: [gainer, loser],
    );
    await settle(tester);

    expect(find.text('See Trending'), findsOneWidget);
    expect(find.text('Gainers'), findsNothing);
    expect(find.text('Hot Catalog Card'), findsNothing);
  });

  testWidgets('See Trending opens gainers and losers', (tester) async {
    await pumpApp(
      tester,
      const BrowseScreen(),
      catalog: catalog,
      recentMovers: [gainer, loser],
    );
    await settle(tester);
    await openTrending(tester);

    expect(find.text('Trending'), findsOneWidget);
    expect(find.text('Catalog-wide recent movers'), findsOneWidget);
    expect(find.text('Gainers'), findsOneWidget);
    expect(find.text('Losers'), findsOneWidget);
    expect(find.text('Jinx, Loose Cannon'), findsOneWidget);
    expect(find.textContaining('+50'), findsWidgets);
    expect(find.text('Hot Catalog Card'), findsOneWidget);
    expect(find.textContaining('\$0.00'), findsNothing);
    expect(find.textContaining('Observed catalog Lows'), findsOneWidget);
  });

  testWidgets('a mover opens Card Detail for that printing', (tester) async {
    await pumpApp(
      tester,
      const BrowseScreen(),
      catalog: catalog,
      recentMovers: [gainer],
    );
    await settle(tester);
    await openTrending(tester);

    await tester.tap(find.text('Jinx, Loose Cannon'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byType(CardDetailScreen), findsOneWidget);
  });

  testWidgets('short lists are not padded and empty copy shows no \$0.00',
      (tester) async {
    await pumpApp(
      tester,
      const BrowseScreen(),
      catalog: catalog,
      recentMovers: [
        mover(direction: 'gainer', rank: 1, name: 'One'),
        mover(direction: 'gainer', rank: 2, cardId: 'b', name: 'Two'),
      ],
    );
    await settle(tester);
    await openTrending(tester);

    expect(find.text('One'), findsOneWidget);
    expect(find.text('Two'), findsOneWidget);
    expect(find.textContaining('No recent losers'), findsOneWidget);
    expect(find.textContaining('\$0.00'), findsNothing);
  });

  testWidgets('a movers error offers Retry', (tester) async {
    await pumpApp(
      tester,
      const BrowseScreen(),
      catalog: catalog,
      recentMoversError: Exception('offline'),
    );
    await settle(tester);
    await openTrending(tester);

    expect(find.text('Retry'), findsOneWidget);
  });
}
