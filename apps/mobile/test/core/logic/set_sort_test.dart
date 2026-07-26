import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/logic/set_sort.dart';

void main() {
  group('setBrowseTier', () {
    test('classifies main expansions as Main Sets', () {
      expect(setBrowseTier('Origins'), BrowseTier.main);
      expect(setBrowseTier('Origins: Proving Grounds'), BrowseTier.main);
      expect(setBrowseTier('Spiritforged'), BrowseTier.main);
      expect(setBrowseTier('Unleashed'), BrowseTier.main);
      expect(setBrowseTier('Vendetta'), BrowseTier.main);
    });

    test('classifies promo / OP lines as Other', () {
      expect(setBrowseTier('Riftbound Promotional Cards'), BrowseTier.other);
      expect(
        setBrowseTier('Riftbound Judge Promotional Cards'),
        BrowseTier.other,
      );
      expect(
        setBrowseTier('Riftbound Organized Play Promotional Cards'),
        BrowseTier.other,
      );
      expect(setBrowseTier('Riftbound Worlds Bundle 2025'), BrowseTier.other);
    });
  });

  group('browseTierLabel', () {
    test('returns section titles', () {
      expect(browseTierLabel(BrowseTier.main), 'Main Sets');
      expect(browseTierLabel(BrowseTier.other), 'Other');
    });
  });

  group('compareSetsByBrowseOrder', () {
    test('orders main sets before other', () {
      final sorted = [
        'Riftbound Promotional Cards',
        'Vendetta',
        'Origins',
      ]..sort(compareSetNamesByBrowseOrder);
      expect(sorted, [
        'Origins',
        'Vendetta',
        'Riftbound Promotional Cards',
      ]);
    });

    test('within a tier, sorts newest publishedOn first', () {
      final names = ['Origins', 'Vendetta', 'Spiritforged'];
      final dates = <String, DateTime>{
        'Origins': DateTime.utc(2025, 10, 31),
        'Vendetta': DateTime.utc(2026, 7, 31),
        'Spiritforged': DateTime.utc(2026, 2, 13),
      };
      names.sort(
        (a, b) => compareSetsByBrowseOrder(
          a,
          b,
          publishedOnA: dates[a],
          publishedOnB: dates[b],
        ),
      );
      expect(names, [
        'Vendetta',
        'Spiritforged',
        'Origins',
      ]);
    });
  });
}
