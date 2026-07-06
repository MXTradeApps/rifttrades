import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/data/card_repository.dart';
import 'package:rifttrades/core/models/card_model.dart';

void main() {
  test('CardModel.fromMap parses a cards_with_prices row', () {
    final card = CardModel.fromMap({
      'id': '684123-foil',
      'product_id': 684123,
      'name': 'Crowd Favorite',
      'set_name': 'Unleashed',
      'sub_type_name': 'Foil',
      'is_foil': true,
      'rarity': 'Common',
      'collector_number': '015/219',
      'image_url': 'https://example.com/684123.jpg',
      'tcg_market': '0.17', // PostgREST may send numerics as strings
      'tcg_low': 0.12,
      'cm_trend': null,
      'cm_low': null,
    });

    expect(card.id, '684123-foil');
    expect(card.productId, 684123);
    expect(card.isFoil, true);
    expect(card.tcgMarket, 0.17);
    expect(card.tcgLow, 0.12);
    expect(card.cmTrend, isNull);
  });

  group('filterCards query matching', () {
    final catalog = [
      const CardModel(id: '1', name: 'Vex - Apathetic', collectorNumber: '001'),
      const CardModel(id: '2', name: 'Vi - Piltover Enforcer'),
      const CardModel(id: '3', name: 'Ashe - Frost Archer'),
    ];

    List<String> namesFor(String query) =>
        filterCards(catalog, CardFilters(query: query))
            .map((c) => c.name)
            .toList();

    test('"Vex a" matches "Vex - Apathetic" across the separator', () {
      expect(namesFor('Vex a'), ['Vex - Apathetic']);
    });

    test('token matching is case-insensitive and order-independent', () {
      expect(namesFor('apathetic VEX'), ['Vex - Apathetic']);
    });

    test('every token must match (AND semantics)', () {
      expect(namesFor('Vex frost'), isEmpty);
    });

    test('empty query returns everything', () {
      expect(namesFor('   ').length, 3);
    });

    test('collector number is searchable', () {
      expect(namesFor('001'), ['Vex - Apathetic']);
    });
  });
}
