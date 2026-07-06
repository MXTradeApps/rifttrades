import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/card_model.dart';

/// Reads card + price data from the shared Supabase database.
class CardRepository {
  CardRepository(this._client);

  final SupabaseClient _client;

  static const String _view = 'cards_with_prices';

  /// Search real (non-sealed) cards by name. Empty query returns the first page
  /// alphabetically. Cheapest-priced printings are surfaced via name ordering.
  Future<List<CardModel>> searchCards(String query, {int limit = 50}) async {
    var builder = _client.from(_view).select().eq('is_sealed', false);

    final trimmed = query.trim();
    if (trimmed.isNotEmpty) {
      builder = builder.ilike('name', '%$trimmed%');
    }

    final rows = await builder.order('name').limit(limit);
    return (rows as List)
        .map((r) => CardModel.fromMap(r as Map<String, dynamic>))
        .toList();
  }

  /// Look up printings by collector number (used by card scanning later).
  Future<List<CardModel>> findByCollectorNumber(String collectorNumber) async {
    final rows = await _client
        .from(_view)
        .select()
        .eq('collector_number', collectorNumber);
    return (rows as List)
        .map((r) => CardModel.fromMap(r as Map<String, dynamic>))
        .toList();
  }
}
