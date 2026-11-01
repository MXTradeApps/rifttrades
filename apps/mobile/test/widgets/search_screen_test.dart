import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/features/search/search_screen.dart';

import '../support/fixtures.dart';
import '../support/harness.dart';

void main() {
  final catalog = [
    buildCard(id: 'a1', name: 'Alpha One', setName: 'Origins', tcgMarket: 1.0),
    buildCard(id: 'a2', name: 'Alpha Two', setName: 'Origins', tcgMarket: 2.0),
  ];

  testWidgets('browse clear button empties the field and resets the search', (
    tester,
  ) async {
    await pumpApp(tester, const BrowseScreen(), catalog: catalog);
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'Two');
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pumpAndSettle();

    expect(find.text('Alpha Two'), findsOneWidget);
    expect(find.text('Alpha One'), findsNothing);

    await tester.tap(find.byTooltip('Clear search'));
    await tester.pumpAndSettle();

    expect(
      (tester.widget<TextField>(find.byType(TextField))).controller?.text,
      '',
    );
    expect(find.text('Origins'), findsOneWidget);
    expect(find.text('Alpha Two'), findsNothing);
  });

  testWidgets('set search clear empties the field and resets the search', (
    tester,
  ) async {
    await pumpApp(
      tester,
      const SetCardsScreen(setName: 'Origins'),
      catalog: catalog,
    );
    await tester.pumpAndSettle();

    expect(find.text('Alpha One'), findsOneWidget);
    expect(find.text('Alpha Two'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'Two');
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pumpAndSettle();

    expect(find.text('Alpha Two'), findsOneWidget);
    expect(find.text('Alpha One'), findsNothing);

    await tester.tap(find.byTooltip('Clear search'));
    await tester.pumpAndSettle();

    expect(
      (tester.widget<TextField>(find.byType(TextField))).controller?.text,
      '',
    );
    expect(find.text('Alpha One'), findsOneWidget);
    expect(find.text('Alpha Two'), findsOneWidget);
  });
}
