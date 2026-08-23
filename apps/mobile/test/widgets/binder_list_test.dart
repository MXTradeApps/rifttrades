import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/logic/free_limits.dart';
import 'package:rifttrades/core/models/binder.dart';
import 'package:rifttrades/core/providers.dart';
import 'package:rifttrades/features/binder/binder_grid.dart';
import 'package:rifttrades/features/binder/binder_screen.dart';
import 'package:rifttrades/features/onboarding/onboarding_repository.dart';

import '../support/fixtures.dart';
import '../support/harness.dart';

Map<String, Object> _onboarded() => {
      OnboardingRepository.storageKey:
          jsonEncode(OnboardingTourId.all.toList()),
    };

Future<ProviderContainer> pumpGrid(WidgetTester tester) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final container = await pumpApp(
    tester,
    const BinderScreen(),
    seed: _onboarded(),
  );
  await tester.pump();
  return container;
}

Future<void> _openTrade(WidgetTester tester) async {
  await tester.tap(find.byKey(const Key('binderTile-system:trade')));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('moves 2 of 3 Trade Binder copies into Collection and updates tiles',
      (tester) async {
    final container = await pumpGrid(tester);
    container.read(binderProvider.notifier).add(
          buildCard(
            id: 'alpha-Normal',
            name: 'Alpha',
            tcgMarket: 2,
            imageUrl: 'https://example.com/a.png',
          ),
          quantity: 3,
          binderId: BinderIds.trade,
        );
    await tester.pump();

    await _openTrade(tester);
    expect(find.text('Alpha'), findsOneWidget);

    await tester.tap(find.byKey(const Key('moveBinder-alpha-Normal')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('moveDest-system:collection')), findsOneWidget);
    expect(find.text('Want List'), findsNothing);

    await tester.tap(find.byKey(const Key('moveDest-system:collection')));
    await tester.pumpAndSettle();
    await tester.tap(find.descendant(
      of: find.byType(AlertDialog),
      matching: find.byIcon(Icons.remove),
    ));
    await tester.pump();
    await tester.tap(find.descendant(
      of: find.byType(AlertDialog),
      matching: find.text('Move'),
    ));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('binderBackToGrid')));
    await tester.pumpAndSettle();

    expect(
      tester
          .widget<Text>(find.byKey(const Key('binderTileCount-system:trade')))
          .data,
      '1',
    );
    expect(
      tester
          .widget<Text>(find.byKey(const Key('binderTileCount-system:collection')))
          .data,
      '2',
    );
    expect(
      tester
          .widget<Text>(find.byKey(const Key('binderTileValue-system:trade')))
          .data,
      '\$2.00',
    );
    expect(
      tester
          .widget<Text>(find.byKey(const Key('binderTileValue-system:collection')))
          .data,
      '\$4.00',
    );
    expect(find.byKey(const Key('binderTileCover-system:trade')), findsOneWidget);
    expect(
      find.byKey(const Key('binderTileCover-system:collection')),
      findsOneWidget,
    );
  });

  testWidgets('merges the same printing and condition on the destination',
      (tester) async {
    final container = await pumpGrid(tester);
    final binder = container.read(binderProvider.notifier);
    binder.add(
      buildCard(id: 'alpha-Normal', name: 'Alpha', tcgMarket: 2),
      quantity: 3,
      binderId: BinderIds.trade,
    );
    binder.add(
      buildCard(id: 'alpha-Normal', name: 'Alpha', tcgMarket: 2),
      quantity: 1,
      binderId: BinderIds.collection,
    );
    await tester.pump();

    await _openTrade(tester);
    await tester.tap(find.byKey(const Key('moveBinder-alpha-Normal')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('moveDest-system:collection')));
    await tester.pumpAndSettle();
    await tester.tap(find.descendant(
      of: find.byType(AlertDialog),
      matching: find.byIcon(Icons.remove),
    ));
    await tester.pump();
    await tester.tap(find.descendant(
      of: find.byType(AlertDialog),
      matching: find.text('Move'),
    ));
    await tester.pumpAndSettle();

    expect(binder.quantityOf('alpha-Normal', binderId: BinderIds.trade), 1);
    expect(binder.quantityOf('alpha-Normal', binderId: BinderIds.collection), 3);
    expect(
      container
          .read(binderProvider)
          .where((e) =>
              !e.isWanted &&
              e.card.id == 'alpha-Normal' &&
              e.resolvedBinderId == BinderIds.collection)
          .length,
      1,
    );
  });

  testWidgets('Want List is not offered as a move destination', (tester) async {
    final container = await pumpGrid(tester);
    container.read(binderProvider.notifier).add(
          buildCard(id: 'alpha-Normal', name: 'Alpha', tcgMarket: 2),
          quantity: 1,
          binderId: BinderIds.trade,
        );
    container.read(binderProvider.notifier).add(
          buildCard(id: 'want-1', name: 'Wanted Card'),
          isWanted: true,
        );
    await tester.pump();

    await _openTrade(tester);
    await tester.tap(find.byKey(const Key('moveBinder-alpha-Normal')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('moveDest-system:collection')), findsOneWidget);
    expect(find.text('Want List'), findsNothing);
    expect(find.byKey(const Key('moveDest-want')), findsNothing);
  });

  testWidgets('refuses a new Printing into a free Binder already at 50',
      (tester) async {
    final container = await pumpGrid(tester);
    final binder = container.read(binderProvider.notifier);
    for (var i = 0; i < FreeLimits.binderCards; i++) {
      expect(
        binder.add(
          buildCard(id: 'c-$i', name: 'Card $i', tcgMarket: 1),
          binderId: BinderIds.collection,
        ),
        isTrue,
      );
    }
    expect(
      binder.add(
        buildCard(id: 'new-print', name: 'Newbie', tcgMarket: 5),
        binderId: BinderIds.trade,
      ),
      isTrue,
    );
    await tester.pump();

    await _openTrade(tester);
    await tester.tap(find.byKey(const Key('moveBinder-new-print')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('moveDest-system:collection')));
    await tester.pumpAndSettle();

    expect(find.textContaining('50'), findsWidgets);
    expect(binder.quantityOf('new-print', binderId: BinderIds.trade), 1);
    expect(
      ownedInBinder(container.read(binderProvider), BinderIds.collection)
          .map((e) => e.card.id)
          .toSet()
          .length,
      FreeLimits.binderCards,
    );
    expect(binder.quantityOf('new-print', binderId: BinderIds.collection), 0);

    final merge = binder.moveCopies(
      printingId: 'c-0',
      fromBinderId: BinderIds.collection,
      toBinderId: BinderIds.collection,
      quantity: 1,
    );
    expect(merge.ok, isFalse);

    binder.add(
      buildCard(id: 'c-0', name: 'Card 0', tcgMarket: 1),
      binderId: BinderIds.trade,
    );
    final qtyUp = binder.moveCopies(
      printingId: 'c-0',
      fromBinderId: BinderIds.trade,
      toBinderId: BinderIds.collection,
      quantity: 1,
    );
    expect(qtyUp.ok, isTrue);
    expect(binder.quantityOf('c-0', binderId: BinderIds.collection), 2);
  });
}
