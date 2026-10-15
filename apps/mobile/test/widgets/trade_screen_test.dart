import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/models/trade.dart';
import 'package:rifttrades/core/providers.dart';
import 'package:rifttrades/features/trade/trade_screen.dart';

import '../support/fixtures.dart';
import '../support/harness.dart';

void main() {
  testWidgets('empty trade shows both add rows and an even balance',
      (tester) async {
    await pumpApp(tester, const TradeScreen());
    await tester.pump();

    expect(find.text('Add my cards'), findsOneWidget);
    expect(find.text('Add their cards'), findsOneWidget);
    expect(find.text('Even'), findsOneWidget);
    expect(find.text('Even trade'), findsOneWidget);
    expect(find.text('You get · 0'), findsOneWidget);
    expect(find.text('You give · 0'), findsOneWidget);
  });

  testWidgets('adding cards updates totals and the delta', (tester) async {
    final container = await pumpApp(tester, const TradeScreen());
    await tester.pump();

    container.read(tradeDraftProvider.notifier).addCard(
          TradeSide.want,
          buildCard(id: 'w', name: 'Their Card', tcgMarket: 10.0),
        );
    container.read(tradeDraftProvider.notifier).addCard(
          TradeSide.have,
          buildCard(id: 'h', name: 'My Card', tcgMarket: 4.0),
        );
    await tester.pump();

    expect(find.text('Their Card'), findsOneWidget);
    expect(find.text('My Card'), findsOneWidget);
    expect(find.text('You get · 1'), findsOneWidget);
    expect(find.text('You give · 1'), findsOneWidget);
    // theirs 10 - mine 4 => +$6.00 in your favor
    expect(find.text('+\$6.00'), findsOneWidget);
    expect(find.text('You get \$6.00 more'), findsOneWidget);
  });

  testWidgets('Find Trade Filler is free and opens without a paywall',
      (tester) async {
    final container = await pumpApp(tester, const TradeScreen());
    await tester.pump();

    container.read(tradeDraftProvider.notifier).addCard(
          TradeSide.want,
          buildCard(id: 'w', name: 'Their Card', tcgMarket: 10.0),
        );
    container.read(tradeDraftProvider.notifier).addCard(
          TradeSide.have,
          buildCard(id: 'h', name: 'My Card', tcgMarket: 4.0),
        );
    await tester.pump();

    expect(find.text('Find Trade Filler'), findsOneWidget);
    expect(find.text('PRO'), findsNothing);

    await tester.tap(find.text('Find Trade Filler'));
    await tester.pumpAndSettle();

    expect(
      find.text('Your side needs \$6.00 more to balance.'),
      findsOneWidget,
    );
    expect(find.text('Subscriptions are unavailable in this build.'),
        findsNothing);
  });

  testWidgets('confirm and clear actions appear once the trade is non-empty',
      (tester) async {
    final container = await pumpApp(tester, const TradeScreen());
    await tester.pump();

    expect(find.text('Confirm Trade'), findsOneWidget);
    expect(
      tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Confirm Trade')).onPressed,
      isNull,
    );

    container.read(tradeDraftProvider.notifier).addCard(
          TradeSide.have,
          buildCard(id: 'h', tcgMarket: 1.0),
        );
    await tester.pump();

    expect(
      tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Confirm Trade')).onPressed,
      isNotNull,
    );
    expect(find.byTooltip('Clear trade'), findsOneWidget);
  });
}
