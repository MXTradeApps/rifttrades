/// Compares dotted version strings (`1.2.3`, optionally with a fourth segment).
///
/// Non-numeric segments are treated as `0`. Missing segments are `0`, so
/// `1.2` equals `1.2.0`.
int compareAppVersions(String a, String b) {
  final aParts = _parts(a);
  final bParts = _parts(b);
  final len = aParts.length > bParts.length ? aParts.length : bParts.length;
  for (var i = 0; i < len; i++) {
    final av = i < aParts.length ? aParts[i] : 0;
    final bv = i < bParts.length ? bParts[i] : 0;
    if (av != bv) return av.compareTo(bv);
  }
  return 0;
}

bool isVersionOlder(String installed, String target) =>
    compareAppVersions(installed, target) < 0;

List<int> _parts(String version) {
  final core = version.split('+').first.trim();
  if (core.isEmpty) return const [0];
  return core.split('.').map((part) {
    final match = RegExp(r'^\d+').firstMatch(part);
    return match == null ? 0 : int.parse(match.group(0)!);
  }).toList();
}
