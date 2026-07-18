import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/data/set_logo_cache.dart';
import 'package:rifttrades/core/data/set_logos.dart';

void main() {
  group('SetLogoMap', () {
    test('parses nested logos shape and exposes urls', () {
      const json = '''
      {
        "logos": {
          "24344": { "name": "Origins", "logoUrl": "asset:set_logos/24344.png" },
          "24698": { "name": "Vendetta", "logoUrl": "https://example.com/ven.png" }
        }
      }
      ''';
      final map = SetLogoMap.fromJson(json);
      expect(map.length, 2);
      expect(map.urlForGroupId(24344), 'asset:set_logos/24344.png');
      expect(map.urls.toSet(), {
        'asset:set_logos/24344.png',
        'https://example.com/ven.png',
      });
    });

    test('parses flat map shape', () {
      const json = '''
      {
        "24344": "asset:set_logos/24344.png"
      }
      ''';
      final map = SetLogoMap.fromJson(json);
      expect(map.urlForGroupId(24344), 'asset:set_logos/24344.png');
      expect(map.urls, ['asset:set_logos/24344.png']);
    });

    test('returns null for missing group ids', () {
      expect(SetLogoMap.empty.urlForGroupId(1), isNull);
      expect(SetLogoMap.empty.urlForGroupId(null), isNull);
    });
  });

  group('asset logo refs', () {
    test('detects and strips the asset: prefix', () {
      expect(isAssetLogoRef('asset:set_logos/24344.png'), isTrue);
      expect(isAssetLogoRef('https://example.com/a.png'), isFalse);
      expect(assetPathFromLogoRef('asset:set_logos/24344.png'),
          'set_logos/24344.png');
    });
  });

  group('SetLogoCache', () {
    test('uses a dedicated long-lived cache key', () {
      expect(SetLogoCache.key, 'setLogoCache');
    });

    test('memCacheHeightFor matches the logo plate size', () {
      expect(
        SetLogoCache.memCacheHeightFor(40, 3),
        ((40 + SetLogoCache.platePadding) * 3).round(),
      );
    });
  });
}
