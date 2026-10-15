import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/logic/recent_movers.dart';
import 'package:rifttrades/core/providers.dart';
import 'package:rifttrades/features/binder/binder_screen.dart';
import 'package:rifttrades/features/binder/collection_stats_screen.dart';
import 'package:rifttrades/features/card_detail/card_detail_screen.dart';
import 'package:rifttrades/features/binder/binder_value_sheet.dart';
import 'package:rifttrades/features/onboarding/onboarding_repository.dart';

import '../support/fixtures.dart';
import '../support/harness.dart';

Map<String, Object> _onboarded() => {
      OnboardingRepository.storageKey:
          jsonEncode(OnboardingTourId.all.toList()),
    };

RecentMoverRow mover({
  required String direction,
  int rank = 1,
  String cardId = 'a-Normal',
  String name = 'Alpha',
  String setName = 'Origins',
  String finish = 'Normal',
  double startLow = 8,
  String startOn = '2026-08-22',
  double latestLow = 10,
  double percentChange = 0.25,
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

Future<void> _sizePhone(WidgetTester tester) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

void main() {
  testWidgets('empty Binder and grid hide the value chip', (tester) async {
    await _sizePhone(tester);
    await pumpApp(tester, const BinderScreen(), seed: _onboarded());
    await tester.pump();
    expect(find.byKey(const Key('binderValueChip')), findsNothing);
    expect(find.byKey(const Key('binderGrid')), findsOneWidget);

    await tester.tap(find.byKey(const Key('binderTile-system:collection')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('binderValueChip')), findsNothing);
    expect(find.byKey(const Key('binderGrid')), findsNothing);
  });

  testWidgets('chip opens Collection Stats matching the total; back leaves entries',
      (tester) async {
    await _sizePhone(tester);
    final container = await pumpApp(
      tester,
      const BinderScreen(),
      seed: _onboarded(),
    );
    await tester.pump();
    container.read(binderProvider.notifier).add(
          buildCard(id: 'a-Normal', name: 'Alpha', tcgMarket: 12.5, tcgLow: 8),
        );
    await tester.pump();
    await tester.tap(find.byKey(const Key('binderTile-system:trade')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('binderValueChip')), findsOneWidget);
    expect(find.text('\$12.50'), findsWidgets);

    await tester.tap(find.byKey(const Key('binderValueChip')));
    await tester.pumpAndSettle();

    expect(find.byType(CollectionStatsScreen), findsOneWidget);
    expect(find.text('Trade Binder'), findsWidgets);
    expect(
      find.descendant(
        of: find.byKey(const Key('collectionStatsHeadline')),
        matching: find.text('\$12.50'),
      ),
      findsOneWidget,
    );
    expect(container.read(binderProvider).single.quantity, 1);

    await tester.pageBack();
    await tester.pumpAndSettle();

    expect(find.byType(CollectionStatsScreen), findsNothing);
    expect(container.read(binderProvider).single.quantity, 1);
    expect(find.text('Alpha'), findsOneWidget);
  });

  testWidgets('Want List tab hides the Binder value chip', (tester) async {
    await _sizePhone(tester);
    final container = await pumpApp(
      tester,
      const BinderScreen(),
      seed: _onboarded(),
    );
    await tester.pump();
    container.read(binderProvider.notifier).add(
          buildCard(id: 'a-Normal', name: 'Alpha', tcgMarket: 12.5),
        );
    await tester.pump();
    await tester.tap(find.byKey(const Key('binderTile-system:trade')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('binderValueChip')), findsOneWidget);
    expect(find.widgetWithText(Tab, 'Want List (0)'), findsNothing);

    await tester.tap(find.byKey(const Key('binderBackToGrid')));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(Tab, 'Want List (0)'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.byKey(const Key('binderValueChip')), findsNothing);
    expect(find.text('Want List'), findsOneWidget);
  });

  testWidgets('breakdown shows TCG Market/Low and CardMarket Trend/Low; unpriced is dash',
      (tester) async {
    await _sizePhone(tester);
    final container = await pumpApp(
      tester,
      const Scaffold(body: SingleChildScrollView(child: BinderValueBreakdown())),
      seed: _onboarded(),
    );
    await tester.pump();
    container.read(binderProvider.notifier).add(
          buildCard(
            id: 'a-Normal',
            name: 'Alpha',
            tcgMarket: 5,
            tcgLow: null,
            cmTrend: 4,
            cmLow: 2,
          ),
        );
    await tester.pump();

    expect(find.text('TCGplayer (USD)'), findsOneWidget);
    expect(find.text('CardMarket (EUR)'), findsOneWidget);
    expect(find.text('Market'), findsOneWidget);
    expect(find.text('Trend'), findsOneWidget);
    expect(find.text('\$5.00'), findsWidgets);
    expect(find.text('€4.00'), findsOneWidget);
    expect(find.text('€2.00'), findsOneWidget);
    expect(find.text('—'), findsOneWidget);
    expect(find.textContaining('unpriced'), findsWidgets);
    expect(find.text('\$0.00'), findsNothing);
    expect(find.text('€0.00'), findsNothing);
  });

  testWidgets('breakdown shows stock counts and top Printings without padding',
      (tester) async {
    await _sizePhone(tester);
    final container = await pumpApp(
      tester,
      const Scaffold(body: SingleChildScrollView(child: BinderValueBreakdown())),
      seed: _onboarded(),
    );
    await tester.pump();
    container.read(binderProvider.notifier).add(
          buildCard(
            id: 'a-Normal',
            name: 'Alpha',
            isFoil: false,
            subTypeName: 'Normal',
            tcgMarket: 10,
          ),
          quantity: 2,
        );
    container.read(binderProvider.notifier).add(
          buildCard(
            id: 'b-RF',
            name: 'Bravo',
            isFoil: true,
            subTypeName: 'Rainbow Foil',
            tcgMarket: 3,
          ),
        );
    await tester.pump();

    expect(find.textContaining('3 copies'), findsOneWidget);
    expect(find.textContaining('2 Printings'), findsOneWidget);
    expect(find.textContaining('1 foil'), findsOneWidget);
    expect(find.textContaining('2 Regular'), findsOneWidget);
    expect(find.text('Top Printings'), findsOneWidget);
    expect(find.text('Alpha'), findsOneWidget);
    expect(find.text('Bravo'), findsOneWidget);
    expect(find.text('\$20.00'), findsWidgets);
    expect(find.text('Top Printings'), findsOneWidget);
  });

  testWidgets('Lend groups do not change overlay totals', (tester) async {
    await _sizePhone(tester);
    final container = await pumpApp(
      tester,
      const Scaffold(body: SingleChildScrollView(child: BinderValueBreakdown())),
      seed: _onboarded(),
    );
    await tester.pump();
    container.read(binderProvider.notifier).add(
          buildCard(id: 'a-Normal', name: 'Alpha', tcgMarket: 12.5),
        );
    final lendId = container.read(lendProvider.notifier).createGroup(
          personName: 'Alex',
        );
    container.read(lendProvider.notifier).addCard(
          lendId,
          buildCard(id: 'lend-1', name: 'Loaned', tcgMarket: 999),
        );
    await tester.pump();

    expect(find.text('\$12.50'), findsWidgets);
    expect(find.text('\$999.00'), findsNothing);
    expect(find.textContaining('1 copies'), findsOneWidget);
    expect(container.read(binderProvider).single.quantity, 1);
  });

  testWidgets('headline shows Total Value with USD and Euro, then the breakdown',
      (tester) async {
    final container = await pumpApp(
      tester,
      const CollectionStatsScreen(),
      seed: _onboarded(),
    );
    await tester.pump();
    container.read(binderProvider.notifier).add(
          buildCard(
            id: 'a-Normal',
            name: 'Alpha',
            tcgMarket: 5,
            tcgLow: null,
            cmTrend: 4,
            cmLow: 2,
          ),
        );
    await tester.pump();
    await tester.pump();

    expect(find.text('Total Value'), findsOneWidget);
    final headline = find.byKey(const Key('collectionStatsHeadline'));
    expect(find.descendant(of: headline, matching: find.text('\$5.00')),
        findsOneWidget);
    expect(find.descendant(of: headline, matching: find.text('€4.00')),
        findsOneWidget);
    // The marketplace breakdown sits under the headline.
    expect(find.byKey(const Key('binderValueBreakdown')), findsOneWidget);
    expect(find.text('TCGplayer (USD)'), findsOneWidget);
    expect(find.text('CardMarket (EUR)'), findsOneWidget);
    expect(find.text('\$0.00'), findsNothing);
    expect(find.text('€0.00'), findsNothing);
    expect(find.byType(CollectionStatsScreen), findsOneWidget);
  });

  testWidgets('movers are this Binder only and show copies; tap opens details',
      (tester) async {
    final alpha = buildCard(
      id: 'a-Normal',
      name: 'Alpha',
      setName: 'Origins',
      subTypeName: 'Normal',
      tcgMarket: 12.5,
      tcgLow: 10,
    );
    final hot = buildCard(
      id: 'hot-unowned',
      name: 'Hot Catalog Card',
      setName: 'Origins',
    );
    final gainer = mover(direction: 'gainer');
    final catalogGainer = mover(
      direction: 'gainer',
      cardId: 'hot-unowned',
      name: 'Hot Catalog Card',
    );
    final container = await pumpApp(
      tester,
      const CollectionStatsScreen(),
      seed: _onboarded(),
      catalog: [alpha, hot],
      recentMovers: [catalogGainer],
      recentMoversByOwnedKey: {
        'a-Normal': [gainer],
      },
    );
    container.read(binderProvider.notifier).add(alpha, quantity: 2);
    await tester.pump();
    await tester.pumpAndSettle();

    expect(find.text('Alpha'), findsWidgets);
    expect(find.textContaining('2 copies'), findsWidgets);
    expect(find.textContaining('Origins'), findsWidgets);
    expect(find.textContaining('Normal'), findsWidgets);
    expect(find.text('Gainers'), findsOneWidget);
    expect(find.text('Hot Catalog Card'), findsNothing);
    expect(find.text('\$0.00'), findsNothing);

    await tester.tap(find.text('Alpha').first);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byType(CardDetailScreen), findsOneWidget);

    await tester.pageBack();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byType(CollectionStatsScreen), findsOneWidget);
    expect(find.byKey(const Key('collectionStatsHeadline')), findsOneWidget);
  });

  testWidgets('a Printing in Binder A does not appear on Binder B',
      (tester) async {
    final alpha = buildCard(id: 'a-Normal', name: 'Alpha', tcgMarket: 12.5);
    await pumpApp(
      tester,
      const CollectionStatsScreen(),
      seed: _onboarded(),
      catalog: [alpha],
      recentMoversByOwnedKey: {
        'a-Normal': [mover(direction: 'gainer')],
      },
    );
    // Collection is open-empty of Alpha (default open is Trade, which is also empty).
    await tester.pumpAndSettle();
    expect(find.text('Alpha'), findsNothing);
    expect(find.text('No Printings in this Binder to rank.'), findsOneWidget);
    expect(find.byKey(const Key('collectionStatsHeadline')), findsOneWidget);
  });

  testWidgets('RPC empty with ids is honest empty; headline stays',
      (tester) async {
    final alpha = buildCard(id: 'a-Normal', name: 'Alpha', tcgMarket: 12.5);
    final container = await pumpApp(
      tester,
      const CollectionStatsScreen(),
      seed: _onboarded(),
      catalog: [alpha],
      recentMoversByOwnedKey: {'a-Normal': const []},
    );
    container.read(binderProvider.notifier).add(alpha);
    await tester.pumpAndSettle();

    expect(
      find.text('None of these Printings gained or lost enough to rank.'),
      findsOneWidget,
    );
    expect(find.text('\$0.00'), findsNothing);
    expect(find.byKey(const Key('collectionStatsHeadline')), findsOneWidget);
  });

  testWidgets('movers error shows retry and leaves headline visible',
      (tester) async {
    final alpha = buildCard(id: 'a-Normal', name: 'Alpha', tcgMarket: 12.5);
    final container = await pumpApp(
      tester,
      const CollectionStatsScreen(),
      seed: _onboarded(),
      catalog: [alpha],
      recentMoversOwnedError: Exception('offline'),
    );
    container.read(binderProvider.notifier).add(alpha);
    await tester.pumpAndSettle();

    expect(find.text('Retry'), findsOneWidget);
    expect(find.byKey(const Key('collectionStatsHeadline')), findsOneWidget);
    expect(find.text('Total Value'), findsOneWidget);
  });

  testWidgets('Want List ids are never sent as movers', (tester) async {
    final owned = buildCard(id: 'a-Normal', name: 'Alpha', tcgMarket: 12.5);
    final wanted = buildCard(id: 'w-Normal', name: 'Wanted Card', tcgMarket: 9);
    final container = await pumpApp(
      tester,
      const CollectionStatsScreen(),
      seed: _onboarded(),
      catalog: [owned, wanted],
      recentMoversByOwnedKey: {
        'a-Normal': [mover(direction: 'gainer')],
      },
    );
    container.read(binderProvider.notifier).add(owned);
    container.read(binderProvider.notifier).add(wanted, isWanted: true);
    await tester.pumpAndSettle();

    expect(find.text('Alpha'), findsWidgets);
    expect(find.text('Wanted Card'), findsNothing);
  });
}
