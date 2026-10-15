import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/app/widgets.dart';
import 'package:rifttrades/core/providers.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../support/fixtures.dart';

void main() {
  Future<void> pumpRow(WidgetTester tester, Widget child) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
        ],
        child: MaterialApp(home: Scaffold(body: child)),
      ),
    );
  }

  Widget wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

  group('CardRow', () {
    testWidgets('renders name and price', (tester) async {
      await pumpRow(
        tester,
        CardRow(
          card: buildCard(name: 'Vex - Apathetic'),
          priceLabel: '\$1.50',
        ),
      );

      expect(find.text('Vex - Apathetic'), findsOneWidget);
      expect(find.text('\$1.50'), findsOneWidget);
    });

    testWidgets('shows Foil tag for foil printings', (tester) async {
      await pumpRow(
        tester,
        CardRow(
          card: buildCard(name: 'Vex', isFoil: true),
          priceLabel: '\$2.00',
        ),
      );
      expect(find.text('Foil'), findsOneWidget);
    });

    testWidgets('hides Foil tag for non-foil printings', (tester) async {
      await pumpRow(
        tester,
        CardRow(
          card: buildCard(name: 'Vex', isFoil: false),
          priceLabel: '\$2.00',
        ),
      );
      expect(find.text('Foil'), findsNothing);
    });

    testWidgets('calls onAdd when the add button is tapped', (tester) async {
      var added = false;
      await pumpRow(
        tester,
        CardRow(
          card: buildCard(name: 'Vex'),
          priceLabel: '\$1.00',
          onAdd: () => added = true,
        ),
      );

      await tester.tap(find.byIcon(Icons.add_circle_outline));
      expect(added, isTrue);
    });

    testWidgets('omits the thumbnail when showThumbnail is false',
        (tester) async {
      await pumpRow(
        tester,
        CardRow(
          card: buildCard(name: 'Vex'),
          priceLabel: '\$1.00',
          showThumbnail: false,
        ),
      );
      expect(find.byType(CardThumbnail), findsNothing);
    });
  });

  group('RarityBadge', () {
    testWidgets('renders the rarity label', (tester) async {
      await tester.pumpWidget(wrap(const RarityBadge(rarity: 'Rare')));
      expect(find.text('Rare'), findsOneWidget);
    });

    testWidgets('renders nothing for None/empty rarity', (tester) async {
      await tester.pumpWidget(wrap(const RarityBadge(rarity: 'None')));
      expect(find.byType(PillBadge), findsNothing);
    });
  });

  group('CardMetaLine', () {
    testWidgets('joins set name and collector number', (tester) async {
      await tester.pumpWidget(wrap(CardMetaLine(
        card: buildCard(setName: 'Origins', collectorNumber: '015/219'),
      )));
      expect(find.text('Origins  •  #015/219'), findsOneWidget);
    });
  });

  group('CardThumbnail', () {
    testWidgets('shows a placeholder icon when url is null', (tester) async {
      await tester.pumpWidget(wrap(const CardThumbnail(url: null)));
      expect(find.byIcon(Icons.image_not_supported_outlined), findsOneWidget);
    });
  });
}
