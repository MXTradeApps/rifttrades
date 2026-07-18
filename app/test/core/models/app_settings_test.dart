import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/models/app_settings.dart';

void main() {
  group('AppSettings', () {
    test('defaults to TCGplayer and dark theme', () {
      const s = AppSettings();
      expect(s.source, PriceSource.tcgplayer);
      expect(s.themeMode, AppThemeMode.dark);
    });

    test('copyWith overrides selectively', () {
      const s = AppSettings();
      final updated = s.copyWith(source: PriceSource.cardmarket);
      expect(updated.source, PriceSource.cardmarket);
      expect(updated.themeMode, AppThemeMode.dark);
    });

    test('toJson -> fromJson round-trips', () {
      const s = AppSettings(
        source: PriceSource.cardmarket,
        themeMode: AppThemeMode.light,
      );
      final restored = AppSettings.fromJson(s.toJson());
      expect(restored.source, PriceSource.cardmarket);
      expect(restored.themeMode, AppThemeMode.light);
    });

    test('fromJson falls back to defaults for unknown enum values', () {
      final restored = AppSettings.fromJson({
        'source': 'nope',
        'themeMode': 'unknown',
      });
      expect(restored.source, PriceSource.tcgplayer);
      expect(restored.themeMode, AppThemeMode.dark);
    });

    test('enum metadata is correct', () {
      expect(PriceSource.tcgplayer.symbol, '\$');
      expect(PriceSource.tcgplayer.currencyCode, 'USD');
      expect(PriceSource.cardmarket.symbol, '€');
      expect(PriceSource.cardmarket.currencyCode, 'EUR');
      expect(PriceSource.tcgplayer.label, 'TCGplayer');
      expect(PriceSource.cardmarket.label, 'CardMarket');
    });
  });
}
