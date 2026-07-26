import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/logic/app_version.dart';

void main() {
  group('compareAppVersions', () {
    test('orders major.minor.patch', () {
      expect(compareAppVersions('1.0.0', '1.0.1'), lessThan(0));
      expect(compareAppVersions('1.0.1', '1.0.0'), greaterThan(0));
      expect(compareAppVersions('1.0.0', '1.0.0'), 0);
      expect(compareAppVersions('2.0.0', '1.9.9'), greaterThan(0));
    });

    test('treats missing segments as zero', () {
      expect(compareAppVersions('1.2', '1.2.0'), 0);
      expect(compareAppVersions('1.2', '1.2.1'), lessThan(0));
    });

    test('ignores build metadata after +', () {
      expect(compareAppVersions('1.0.0+3', '1.0.0+99'), 0);
      expect(compareAppVersions('1.0.0+3', '1.0.1+1'), lessThan(0));
    });
  });

  group('isVersionOlder', () {
    test('true only when installed is behind target', () {
      expect(isVersionOlder('1.0.0', '1.0.1'), isTrue);
      expect(isVersionOlder('1.0.1', '1.0.1'), isFalse);
      expect(isVersionOlder('1.1.0', '1.0.9'), isFalse);
    });
  });
}
