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

/// Reads card + price data from the shared Supabase database.
class CardRepository {
  CardRepository(this._client);

  final SupabaseClient _client;

  static const String _view = 'cards_with_prices';

  Future<List<CardModel>> search(CardFilters filters, {int limit = 60}) async {
    var builder = _client.from(_view).select().eq('is_sealed', false);

    final q = filters.query.trim();
    if (q.isNotEmpty) {
      builder = builder.ilike('name', '%$q%');
    }
    if (filters.setName != null) {
      builder = builder.eq('set_name', filters.setName!);
    }
    if (filters.foilOnly) {
      builder = builder.eq('is_foil', true);
    }

    final transform = switch (filters.sort) {
      CardSort.nameAsc => builder.order('name'),
      CardSort.priceDesc =>
        builder.order('tcg_market', ascending: false, nullsFirst: false),
      CardSort.priceAsc =>
        builder.order('tcg_market', ascending: true, nullsFirst: false),
      CardSort.numberAsc => builder.order('collector_number'),
    };

    final rows = await transform.limit(limit);
    return (rows as List)
        .map((r) => CardModel.fromMap(r as Map<String, dynamic>))
        .toList();
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
