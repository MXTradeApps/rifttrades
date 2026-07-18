import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/models/app_config.dart';
import 'package:rifttrades/core/update/app_update_checker.dart';

void main() {
  const config = AppConfig(
    latestVersion: '1.0.1',
    androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.rifttrades.myapp',
    message: 'Please update.',
  );

  group('AppUpdateDecision.evaluate', () {
    test('returns null when already on latest', () {
      expect(
        AppUpdateDecision.evaluate(
          installedVersion: '1.0.1',
          config: config,
          dismissedForVersion: null,
          isIOS: false,
        ),
        isNull,
      );
    });

    test('prompts when installed is older', () {
      final prompt = AppUpdateDecision.evaluate(
        installedVersion: '1.0.0',
        config: config,
        dismissedForVersion: null,
        isIOS: false,
      );
      expect(prompt, isNotNull);
      expect(prompt!.latestVersion, '1.0.1');
      expect(prompt.message, 'Please update.');
      expect(prompt.forced, isFalse);
      expect(prompt.storeUrl, config.androidStoreUrl);
    });

    test('respects dismiss for the same latest version', () {
      expect(
        AppUpdateDecision.evaluate(
          installedVersion: '1.0.0',
          config: config,
          dismissedForVersion: '1.0.1',
          isIOS: false,
        ),
        isNull,
      );
    });

    test('re-prompts after dismiss when latest bumps again', () {
      final prompt = AppUpdateDecision.evaluate(
        installedVersion: '1.0.0',
        config: const AppConfig(latestVersion: '1.0.2', message: 'Newer'),
        dismissedForVersion: '1.0.1',
        isIOS: false,
      );
      expect(prompt, isNotNull);
      expect(prompt!.latestVersion, '1.0.2');
    });

    test('forced update ignores dismiss and sets forced', () {
      final prompt = AppUpdateDecision.evaluate(
        installedVersion: '1.0.0',
        config: const AppConfig(
          latestVersion: '1.0.1',
          minVersion: '1.0.1',
          androidStoreUrl: 'https://example.com',
          message: 'Must update',
        ),
        dismissedForVersion: '1.0.1',
        isIOS: false,
      );
      expect(prompt, isNotNull);
      expect(prompt!.forced, isTrue);
    });

    test('uses iOS store URL on iOS', () {
      final prompt = AppUpdateDecision.evaluate(
        installedVersion: '1.0.0',
        config: const AppConfig(
          latestVersion: '1.0.1',
          androidStoreUrl: 'https://play.example',
          iosStoreUrl: 'https://apps.apple.com/app/id123',
        ),
        dismissedForVersion: null,
        isIOS: true,
      );
      expect(prompt!.storeUrl, 'https://apps.apple.com/app/id123');
    });

    test('falls back to default message when remote message empty', () {
      final prompt = AppUpdateDecision.evaluate(
        installedVersion: '1.0.0',
        config: const AppConfig(latestVersion: '1.0.1', message: '  '),
        dismissedForVersion: null,
        isIOS: false,
      );
      expect(prompt!.message, contains('RiftTrades'));
    });
  });
}
