import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/data/set_published_on.dart';

void main() {
  group('SetPublishedOnMap', () {
    test('parses nested publishedOn shape', () {
      const json = '''
      {
        "publishedOn": {
          "24344": "2025-10-31T00:00:00",
          "24698": "2026-07-31T00:00:00"
        }
      }
      ''';
      final map = SetPublishedOnMap.fromJson(json);
      expect(map.length, 2);
      expect(map.forGroupId(24344), DateTime.parse('2025-10-31T00:00:00'));
      expect(map.forGroupId(24698), DateTime.parse('2026-07-31T00:00:00'));
    });

    test('returns null for missing group ids', () {
      expect(SetPublishedOnMap.empty.forGroupId(1), isNull);
      expect(SetPublishedOnMap.empty.forGroupId(null), isNull);
    });
  });
}
