// Browse-list ordering for Riftbound product groups.
//
// Tiers (lower first):
//   0 — Main Sets
//   1 — Other (promos, bundles, etc.)
//
// Categories are inferred from the set name; the catalog does not expose a
// product-line enum for these buckets.

class BrowseTier {
  static const main = 0;
  static const other = 1;
}

const _browseTierLabels = <int, String>{
  BrowseTier.main: 'Main Sets',
  BrowseTier.other: 'Other',
};

final _otherProductLinePatterns = <RegExp>[
  RegExp(r'\bpromo(?:tional)? cards\b', caseSensitive: false),
  RegExp(r'\bworlds bundle\b', caseSensitive: false),
  RegExp(r'^riftbound judge\b', caseSensitive: false),
  RegExp(r'^riftbound organized play\b', caseSensitive: false),
  RegExp(r'^riftbound promotional\b', caseSensitive: false),
];

/// Browse-list tier for [name]. Lower sorts first.
int setBrowseTier(String? name) {
  final n = (name ?? '').trim();
  if (n.isEmpty) return BrowseTier.other;

  for (final re in _otherProductLinePatterns) {
    if (re.hasMatch(n)) return BrowseTier.other;
  }
  return BrowseTier.main;
}

/// Human-readable section title for a browse [tier].
String browseTierLabel(int tier) =>
    _browseTierLabels[tier] ?? _browseTierLabels[BrowseTier.other]!;

/// Compare two sets: tier first, then newest [publishedOnA]/[publishedOnB]
/// within a tier, then name A–Z as a stable fallback.
int compareSetsByBrowseOrder(
  String nameA,
  String nameB, {
  DateTime? publishedOnA,
  DateTime? publishedOnB,
}) {
  final tierDiff = setBrowseTier(nameA) - setBrowseTier(nameB);
  if (tierDiff != 0) return tierDiff;

  final da = publishedOnA?.millisecondsSinceEpoch ?? 0;
  final db = publishedOnB?.millisecondsSinceEpoch ?? 0;
  if (db != da) return db - da;

  return nameA.toLowerCase().compareTo(nameB.toLowerCase());
}

/// Compare set names: tier first, then alphabetical within a tier.
int compareSetNamesByBrowseOrder(String a, String b) =>
    compareSetsByBrowseOrder(a, b);
