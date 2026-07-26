import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/data/card_repository.dart';

import '../../support/fixtures.dart';

void main() {
  group('isNonCardProduct', () {
    test('true when both rarity and collector number are missing', () {
      expect(
        isNonCardProduct(buildCard(rarity: null, collectorNumber: null)),
        isTrue,
      );
    });

    test('treats "None" rarity and blank number as missing', () {
      expect(
        isNonCardProduct(buildCard(rarity: 'None', collectorNumber: '  ')),
        isTrue,
      );
    });

    test('false when a rarity exists', () {
      expect(
        isNonCardProduct(buildCard(rarity: 'Common', collectorNumber: null)),
        isFalse,
      );
    });

    test('false when a collector number exists', () {
      expect(
        isNonCardProduct(buildCard(rarity: null, collectorNumber: '015/219')),
        isFalse,
      );
    });
  });

  group('nameQualifier', () {
    test('extracts trailing parenthetical', () {
      expect(nameQualifier('Ahri - Inquisitive (Overnumbered)'), 'Overnumbered');
    });

    test('returns null when there is no qualifier', () {
      expect(nameQualifier('Ahri - Inquisitive'), isNull);
    });
  });

  group('baseCardName', () {
    test('strips a single trailing qualifier', () {
      expect(baseCardName('Vex (Alternate Art)'), 'Vex');
    });

    test('strips multiple stacked qualifiers', () {
      expect(baseCardName('Vex (Alternate Art) (Signature)'), 'Vex');
    });

    test('leaves a plain name untouched', () {
      expect(baseCardName('Vex - Apathetic'), 'Vex - Apathetic');
    });

    test('does not strip a name that is only a parenthetical', () {
      expect(baseCardName('(Buff)'), '(Buff)');
    });
  });

  group('rarityRank', () {
    test('orders common below rare below champion', () {
      expect(rarityRank('Common') < rarityRank('Rare'), isTrue);
      expect(rarityRank('Rare') < rarityRank('Champion'), isTrue);
    });

    test('champion and legendary share a rank', () {
      expect(rarityRank('Champion'), rarityRank('Legendary'));
    });

    test('unknown rarities sort last', () {
      expect(rarityRank('mythic'), 7);
      expect(rarityRank(null), 7);
    });
  });

  group('groupCardsByName', () {
    test('collapses art/finish variants into one group', () {
      final cards = [
        buildCard(id: 'n', name: 'Vex', isFoil: false),
        buildCard(id: 'f', name: 'Vex', isFoil: true),
        buildCard(id: 'alt', name: 'Vex (Alternate Art)'),
      ];
      final groups = groupCardsByName(cards, CardSort.nameAsc);
      expect(groups.length, 1);
      expect(groups.single.name, 'Vex');
      expect(groups.single.versions.length, 3);
      expect(groups.single.hasMultiple, isTrue);
    });

    test('representative is the non-foil base printing', () {
      final cards = [
        buildCard(id: 'f', name: 'Vex', isFoil: true, rarity: 'Common'),
        buildCard(id: 'n', name: 'Vex', isFoil: false, rarity: 'Common'),
      ];
      final groups = groupCardsByName(cards, CardSort.nameAsc);
      expect(groups.single.representative.id, 'n');
    });

    test('nameAsc orders groups alphabetically', () {
      final cards = [
        buildCard(id: '1', name: 'Zed'),
        buildCard(id: '2', name: 'Ahri'),
      ];
      final groups = groupCardsByName(cards, CardSort.nameAsc);
      expect(groups.map((g) => g.name), ['Ahri', 'Zed']);
    });

    test('priceDesc orders by representative price, nulls last', () {
      final cards = [
        buildCard(id: '1', name: 'Cheap', tcgMarket: 1),
        buildCard(id: '2', name: 'Pricey', tcgMarket: 10),
        buildCard(id: '3', name: 'Unpriced'),
      ];
      final groups = groupCardsByName(cards, CardSort.priceDesc);
      expect(groups.map((g) => g.name), ['Pricey', 'Cheap', 'Unpriced']);
    });
  });

  group('printingsForCard', () {
    test('returns every variant sharing the base name, base-first', () {
      final target = buildCard(id: 'n', name: 'Vex');
      final catalog = [
        buildCard(id: 'f', name: 'Vex', isFoil: true),
        target,
        buildCard(id: 'other', name: 'Ahri'),
      ];
      final printings = printingsForCard(catalog, target);
      expect(printings.map((c) => c.id), ['n', 'f']);
    });

    test('falls back to the card itself when not in catalog', () {
      final target = buildCard(id: 'lonely', name: 'Nobody');
      final printings = printingsForCard(const [], target);
      expect(printings.single.id, 'lonely');
    });
  });

  group('withoutPhantomNormals', () {
    test('drops a subtype-less non-foil row whose product has a foil', () {
      final phantom = buildCard(
          id: '1-base', productId: 1, subTypeName: null, isFoil: false);
      final foil = buildCard(
          id: '1-foil', productId: 1, subTypeName: 'Foil', isFoil: true);
      expect(withoutPhantomNormals([phantom, foil]), [foil]);
    });

    test('keeps a subtype-less non-foil row with no foil sibling', () {
      final unpriced = buildCard(
          id: '2-base', productId: 2, subTypeName: null, isFoil: false);
      expect(withoutPhantomNormals([unpriced]), [unpriced]);
    });

    test('keeps a real Normal printing alongside its foil', () {
      final normal = buildCard(
          id: '3-normal', productId: 3, subTypeName: 'Normal', isFoil: false);
      final foil = buildCard(
          id: '3-foil', productId: 3, subTypeName: 'Foil', isFoil: true);
      expect(withoutPhantomNormals([normal, foil]), [normal, foil]);
    });

    test('does not treat productId-less rows as foil siblings', () {
      final noProduct = buildCard(
          id: 'x', productId: null, subTypeName: null, isFoil: false);
      final foil = buildCard(
          id: 'y-foil', productId: null, subTypeName: 'Foil', isFoil: true);
      expect(withoutPhantomNormals([noProduct, foil]),
          [noProduct, foil]);
    });
  });

  group('oppositeFinish', () {
    test('finds the foil sharing a productId', () {
      final normal = buildCard(id: 'n', productId: 100, isFoil: false);
      final foil = buildCard(id: 'f', productId: 100, isFoil: true);
      expect(oppositeFinish([normal, foil], normal)?.id, 'f');
    });

    test('matches on name + number when no productId', () {
      final normal =
          buildCard(id: 'n', name: 'Vex', collectorNumber: '5', isFoil: false);
      final foil =
          buildCard(id: 'f', name: 'Vex', collectorNumber: '5', isFoil: true);
      expect(oppositeFinish([normal, foil], normal)?.id, 'f');
    });

    test('returns null when there is no alternate finish', () {
      final normal = buildCard(id: 'n', productId: 1, isFoil: false);
      expect(oppositeFinish([normal], normal), isNull);
    });
  });
}
