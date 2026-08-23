import 'dart:convert';
import 'dart:io';

/// Loads a golden contract fixture from `test/fixtures/<name>.json`.
///
/// The same bytes live under `apps/web/tests/fixtures/`. `flutter test` runs
/// with `apps/mobile` as the working directory.
Map<String, dynamic> loadContract(String name) {
  final file = File('test/fixtures/$name.json');
  if (!file.existsSync()) {
    throw StateError(
      'Contract fixture not found at ${file.absolute.path}. '
      'Run `flutter test` from apps/mobile so relative paths resolve.',
    );
  }
  return jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
}

/// Fixture rows are `List<dynamic>` off the wire; this narrows them once so the
/// tests read cleanly.
List<Map<String, dynamic>> contractCases(
  Map<String, dynamic> contract,
  String key,
) =>
    (contract[key] as List)
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
