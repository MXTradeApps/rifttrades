import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/app/printing_picker.dart';

import '../support/fixtures.dart';

void main() {
  group('printingLabel', () {
    test('includes set, rarity, number, and finish for a base printing', () {
      final card = buildCard(
        name: 'Ahri - Inquisitive',
        setName: 'Origins',
        rarity: 'Epic',
        collectorNumber: '119/298',
        isFoil: true,
        subTypeName: 'Foil',
      );
      expect(
        printingLabel(card),
        'Origins · Epic · #119/298 · Foil',
      );
    });

    test('prefixes the name qualifier for alternate arts', () {
      final card = buildCard(
        name: 'Ahri - Inquisitive (Alternate Art)',
        setName: 'Origins',
        rarity: 'Showcase',
        collectorNumber: '119a/298',
        isFoil: true,
      );
      expect(
        printingLabel(card),
        'Alternate Art · Origins · Showcase · #119a/298 · Foil',
      );
    });

    test('distinguishes cross-set reprints that share a plain name', () {
      final origins = buildCard(
        name: 'Ahri - Inquisitive',
        setName: 'Origins',
        rarity: 'Epic',
        collectorNumber: '119/298',
        isFoil: true,
      );
      final vendetta = buildCard(
        name: 'Ahri - Inquisitive',
        setName: 'Vendetta',
        rarity: 'Showcase',
        collectorNumber: 'SP3/006',
        isFoil: true,
      );
      expect(printingLabel(origins), isNot(printingLabel(vendetta)));
      expect(printingLabel(vendetta), contains('Vendetta'));
      expect(printingLabel(vendetta), contains('#SP3/006'));
    });

    test('falls back to finish alone when no other metadata is present', () {
      final card = buildCard(
        name: 'Buff',
        setName: null,
        rarity: null,
        collectorNumber: null,
        isFoil: false,
        subTypeName: 'Normal',
      );
      expect(printingLabel(card), 'Normal');
    });
  });
}
