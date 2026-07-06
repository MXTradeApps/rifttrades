import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/card_model.dart';

enum CardSort {
  nameAsc('Name (A–Z)'),
  priceDesc('Price (high → low)'),
  priceAsc('Price (low → high)'),
  numberAsc('Collector #');

  const CardSort(this.label);
  final String label;
}

class CardFilters {
  final String query;
  final String? setName;
  final bool foilOnly;
  final CardSort sort;

  const CardFilters({
    this.query = '',
    this.setName,
    this.foilOnly = false,
    this.sort = CardSort.nameAsc,
  });

  /// Filters the user can toggle while browsing a set (set itself excluded).
  bool get hasActiveFilters => foilOnly || sort != CardSort.nameAsc;

  CardFilters copyWith({
    String? query,
    Object? setName = _sentinel,
    bool? foilOnly,
    CardSort? sort,
  }) =>
      CardFilters(
        query: query ?? this.query,
        setName: setName == _sentinel ? this.setName : setName as String?,
        foilOnly: foilOnly ?? this.foilOnly,
        sort: sort ?? this.sort,
      );

  static const _sentinel = Object();
}

/// Builds the lowercased text a card is searched against: its name, plus
/// cleanName and collectorNumber when present (so number lookups still work).
String _searchableText(CardModel c) {
  final buffer = StringBuffer(c.name);
  if (c.cleanName != null) buffer..write(' ')..write(c.cleanName);
  if (c.collectorNumber != null) buffer..write(' ')..write(c.collectorNumber);
  return buffer.toString().toLowerCase();
}

/// Natural, token-based query matching: the query is split on whitespace into
/// tokens and a card matches when EVERY token appears somewhere in its
/// searchable text. This lets "Vex a" match "Vex - Apathetic" even though the
/// separator means "vex a" isn't a contiguous substring of the name.
bool _matchesQuery(CardModel c, List<String> tokens) {
  if (tokens.isEmpty) return true;
  final text = _searchableText(c);
  for (final t in tokens) {
    if (!text.contains(t)) return false;
  }
  return true;
}

/// Applies [filters] to an in-memory catalog (used for instant, offline
/// browsing). Mirrors the ordering the database previously produced.
List<CardModel> filterCards(List<CardModel> all, CardFilters filters) {
  final tokens = filters.query
      .toLowerCase()
      .split(RegExp(r'\s+'))
      .where((t) => t.isNotEmpty)
      .toList();
  final list = all.where((c) {
    if (!_matchesQuery(c, tokens)) return false;
    if (filters.setName != null && c.setName != filters.setName) return false;
    if (filters.foilOnly && !c.isFoil) return false;
    return true;
  }).toList();

  int byPrice(double? a, double? b, {required bool asc}) {
    if (a == null && b == null) return 0;
    if (a == null) return 1; // nulls last
    if (b == null) return -1;
    return asc ? a.compareTo(b) : b.compareTo(a);
  }

  switch (filters.sort) {
    case CardSort.nameAsc:
      list.sort((a, b) =>
          a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    case CardSort.priceDesc:
      list.sort((a, b) => byPrice(a.tcgMarket, b.tcgMarket, asc: false));
    case CardSort.priceAsc:
      list.sort((a, b) => byPrice(a.tcgMarket, b.tcgMarket, asc: true));
    case CardSort.numberAsc:
      list.sort((a, b) {
        final an = a.collectorNumber;
        final bn = b.collectorNumber;
        if (an == null && bn == null) return 0;
        if (an == null) return 1;
        if (bn == null) return -1;
        return an.compareTo(bn);
      });
  }
  return list;
}

// ---------------------------------------------------------------------------
// Grouping printings by card name (for the grouped Browse view)
// ---------------------------------------------------------------------------

/// All printings/versions that share a single card name, plus the
/// "representative" printing whose price/art is shown on the collapsed row.
class CardGroup {
  const CardGroup({
    required this.name,
    required this.representative,
    required this.versions,
  });

  final String name;

  /// The base-rarity printing used for the collapsed row (see [_baseFirst]).
  final CardModel representative;

  /// Every printing in this group (base first), e.g. Normal / Foil / alt-art.
  final List<CardModel> versions;

  bool get hasMultiple => versions.length > 1;
}

/// Ordering of rarities from most "base"/standard (0) to most premium, used to
/// choose which printing represents a group. Unknown rarities sort last.
int rarityRank(String? rarity) {
  switch (rarity?.toLowerCase()) {
    case 'common':
      return 0;
    case 'uncommon':
      return 1;
    case 'rare':
      return 2;
    case 'epic':
      return 3;
    case 'champion':
    case 'legendary':
      return 4;
    case 'showcase':
      return 5;
    case 'promo':
      return 6;
    default:
      return 7;
  }
}

/// First run of digits in a collector number like "147/219" -> 147, used to
/// order printings within a group. Returns null when there is no number.
int? _leadingNumber(String? raw) {
  if (raw == null) return null;
  final match = RegExp(r'\d+').firstMatch(raw);
  return match == null ? null : int.tryParse(match.group(0)!);
}

/// Comparator that puts the most "base" printing first: non-foil before foil,
/// then lowest rarity, then a printing that actually has a price, then lowest
/// collector number. Used both to pick the representative and to order the
/// version list.
int _baseFirst(CardModel a, CardModel b) {
  if (a.isFoil != b.isFoil) return a.isFoil ? 1 : -1;
  final ra = rarityRank(a.rarity);
  final rb = rarityRank(b.rarity);
  if (ra != rb) return ra.compareTo(rb);
  final ap = a.tcgMarket ?? a.tcgLow;
  final bp = b.tcgMarket ?? b.tcgLow;
  if ((ap == null) != (bp == null)) return ap == null ? 1 : -1;
  final an = _leadingNumber(a.collectorNumber);
  final bn = _leadingNumber(b.collectorNumber);
  if (an != null && bn != null && an != bn) return an.compareTo(bn);
  return a.id.compareTo(b.id);
}

/// Groups [cards] by card name into [CardGroup]s, ordering the groups by the
/// requested [sort] (applied to each group's representative printing). Assumes
/// [cards] has already been filtered by [filterCards].
List<CardGroup> groupCardsByName(List<CardModel> cards, CardSort sort) {
  final byName = <String, List<CardModel>>{};
  final order = <String>[];
  for (final c in cards) {
    final list = byName[c.name];
    if (list == null) {
      byName[c.name] = [c];
      order.add(c.name);
    } else {
      list.add(c);
    }
  }

  final groups = <CardGroup>[];
  for (final name in order) {
    final versions = byName[name]!..sort(_baseFirst);
    groups.add(CardGroup(
      name: name,
      representative: versions.first,
      versions: versions,
    ));
  }

  int byPrice(double? a, double? b, {required bool asc}) {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return asc ? a.compareTo(b) : b.compareTo(a);
  }

  switch (sort) {
    case CardSort.nameAsc:
      groups.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    case CardSort.priceDesc:
      groups.sort((a, b) => byPrice(
          a.representative.tcgMarket, b.representative.tcgMarket, asc: false));
    case CardSort.priceAsc:
      groups.sort((a, b) => byPrice(
          a.representative.tcgMarket, b.representative.tcgMarket, asc: true));
    case CardSort.numberAsc:
      groups.sort((a, b) {
        final an = a.representative.collectorNumber;
        final bn = b.representative.collectorNumber;
        if (an == null && bn == null) return 0;
        if (an == null) return 1;
        if (bn == null) return -1;
        return an.compareTo(bn);
      });
  }
  return groups;
}

/// Finds the opposite-finish printing (Normal <-> Foil) of [card] within
/// [catalog], or null if this card has no alternate finish. Finishes of the
/// same physical card share a `product_id` and differ only by `is_foil`.
CardModel? oppositeFinish(List<CardModel> catalog, CardModel card) {
  for (final c in catalog) {
    if (c.isFoil == card.isFoil) continue;
    if (card.productId != null && c.productId == card.productId) return c;
    if (card.productId == null &&
        c.name == card.name &&
        c.collectorNumber == card.collectorNumber) {
      return c;
    }
  }
  return null;
}

/// Reads card + price data from the shared Supabase database.
class CardRepository {
  CardRepository(this._client);

  final SupabaseClient _client;

  static const String _view = 'cards_with_prices';

  /// Fetches the entire (non-sealed) catalog for local caching. PostgREST caps
  /// a single response at 1000 rows, so page through with `range` until drained.
  Future<List<CardModel>> fetchAll() async {
    const pageSize = 1000;
    final all = <CardModel>[];
    var from = 0;
    while (true) {
      final rows = await _client
          .from(_view)
          .select()
          .eq('is_sealed', false)
          .order('name')
          .range(from, from + pageSize - 1);
      final list = rows as List;
      all.addAll(
          list.map((r) => CardModel.fromMap(r as Map<String, dynamic>)));
      if (list.length < pageSize) break;
      from += pageSize;
    }
    return all;
  }

  /// All printings (normal/foil/alt) that share a card name.
  Future<List<CardModel>> printingsForName(String name) async {
    final rows = await _client
        .from(_view)
        .select()
        .eq('name', name)
        .eq('is_sealed', false)
        .order('is_foil');
    return (rows as List)
        .map((r) => CardModel.fromMap(r as Map<String, dynamic>))
        .toList();
  }

  /// Daily price snapshots for a printing (oldest → newest) for charts.
  Future<List<PricePoint>> priceHistory(String cardId) async {
    final rows = await _client
        .from('price_history')
        .select()
        .eq('card_id', cardId)
        .order('captured_on');
    return (rows as List)
        .map((r) => PricePoint.fromMap(r as Map<String, dynamic>))
        .toList();
  }

  /// Look up printings by collector number (used by card scanning).
  Future<List<CardModel>> findByCollectorNumber(String collectorNumber) async {
    final rows = await _client
        .from(_view)
        .select()
        .eq('is_sealed', false)
        .eq('collector_number', collectorNumber);
    return (rows as List)
        .map((r) => CardModel.fromMap(r as Map<String, dynamic>))
        .toList();
  }

  static const List<String> setNames = [
    'Origins',
    'Origins: Proving Grounds',
    'Spiritforged',
    'Unleashed',
    'Vendetta',
    'Riftbound Promotional Cards',
    'Riftbound Judge Promotional Cards',
    'Riftbound Organized Play Promotional Cards',
  ];
}
