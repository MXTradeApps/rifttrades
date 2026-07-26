import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/config/supabase_config.dart';

/// The `env/*.json` files decide which Supabase project a build talks to, and the
/// app refuses to start without one. A malformed or half-filled file is therefore
/// a release that crashes on launch — cheap to catch here, expensive to catch in a
/// tester's crash report.
void main() {
  final files = Directory('env')
      .listSync()
      .whereType<File>()
      .where((f) => f.path.endsWith('.json'))
      .toList()
    ..sort((a, b) => a.path.compareTo(b.path));

  test('there is at least one build environment', () {
    expect(files, isNotEmpty);
  });

  for (final file in files) {
    final name = file.uri.pathSegments.last;
    final environment = name.replaceAll('.json', '');

    group(name, () {
      late Map<String, dynamic> values;

      setUp(() {
        final decoded = jsonDecode(file.readAsStringSync());
        expect(decoded, isA<Map<String, dynamic>>());
        values = decoded as Map<String, dynamic>;
      });

      test('declares every key the app reads', () {
        expect(
          values.keys,
          containsAll(['APP_ENV', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY']),
        );
      });

      test('names the environment after its file', () {
        // Otherwise a staging build says "production" in Settings, which is worse
        // than saying nothing.
        expect(values['APP_ENV'], environment);
      });

      test('points at a real project', () {
        // Blank values are not allowed — a half-filled file would let a build
        // start with no usable backend, or worse, look configured when it is not.
        final url = values['SUPABASE_URL'] as String;
        final key = values['SUPABASE_PUBLISHABLE_KEY'] as String;
        expect(url, startsWith('https://'));
        expect(url, isNotEmpty);
        expect(key, isNotEmpty);
      });
    });
  }

  test('production and staging parse as JSON objects', () {
    final production =
        jsonDecode(File('env/production.json').readAsStringSync());
    final staging = jsonDecode(File('env/staging.json').readAsStringSync());
    expect(production, isA<Map<String, dynamic>>());
    expect(staging, isA<Map<String, dynamic>>());
  });

  test('staging is not production', () {
    // Catches a copy-paste that would let a test build write real data.
    final production = jsonDecode(File('env/production.json').readAsStringSync())
        as Map<String, dynamic>;
    final staging = jsonDecode(File('env/staging.json').readAsStringSync())
        as Map<String, dynamic>;

    expect(
      staging['SUPABASE_URL'],
      isNot(equals(production['SUPABASE_URL'])),
    );
    expect(
      staging['SUPABASE_PUBLISHABLE_KEY'],
      isNot(equals(production['SUPABASE_PUBLISHABLE_KEY'])),
    );
  });

  group('compile-time configuration', () {
    // Reading the JSON files on disk is not enough — the suite must also prove
    // the build was actually given those values. Without that, `flutter test`
    // with no `--dart-define-from-file` passes silently while a real run would
    // throw at startup.
    test('was told which backend to use', () {
      expect(
        () => SupabaseConfig.assertConfigured(),
        returnsNormally,
        reason:
            'Pass --dart-define-from-file=env/production.json (or staging) so '
            'the suite exercises the same build-time config a release uses.',
      );
      expect(SupabaseConfig.url, isNotEmpty);
      expect(SupabaseConfig.publishableKey, isNotEmpty);
    });

    test('matches the env file named by APP_ENV', () {
      // Otherwise the constants could come from somewhere else and the flag
      // would look wired when it is not.
      final expected = jsonDecode(
            File('env/${SupabaseConfig.environment}.json').readAsStringSync(),
          )
          as Map<String, dynamic>;
      expect(SupabaseConfig.url, expected['SUPABASE_URL']);
      expect(
        SupabaseConfig.publishableKey,
        expected['SUPABASE_PUBLISHABLE_KEY'],
      );
    });
  });
}
