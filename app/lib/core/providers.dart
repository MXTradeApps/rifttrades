import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'data/card_repository.dart';
import 'data/collection_repository.dart';
import 'data/settings_repository.dart';
import 'data/trade_repository.dart';
import 'logic/pricing.dart';
import 'models/app_settings.dart';
import 'models/card_model.dart';
import 'models/collection_entry.dart';
import 'models/trade.dart';

/// Overridden in main() with the real instance.
final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('SharedPreferences not initialized'),
);

final supabaseClientProvider =
    Provider<SupabaseClient>((ref) => Supabase.instance.client);

final cardRepositoryProvider = Provider<CardRepository>(
    (ref) => CardRepository(ref.watch(supabaseClientProvider)));

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
final settingsRepositoryProvider = Provider<SettingsRepository>(
    (ref) => SettingsRepository(ref.watch(sharedPreferencesProvider)));

class SettingsNotifier extends Notifier<AppSettings> {
  @override
  AppSettings build() => ref.watch(settingsRepositoryProvider).load();

  void setSource(PriceSource source) {
    state = state.copyWith(source: source);
    ref.read(settingsRepositoryProvider).save(state);
  }

  void setType(PriceType type) {
    state = state.copyWith(type: type);
    ref.read(settingsRepositoryProvider).save(state);
  }
}

final settingsProvider =
    NotifierProvider<SettingsNotifier, AppSettings>(SettingsNotifier.new);

final pricingProvider =
    Provider<Pricing>((ref) => Pricing(ref.watch(settingsProvider)));

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
final searchFiltersProvider =
    NotifierProvider<SearchFiltersNotifier, CardFilters>(
        SearchFiltersNotifier.new);

class SearchFiltersNotifier extends Notifier<CardFilters> {
  @override
  CardFilters build() => const CardFilters();

  void setQuery(String q) => state = state.copyWith(query: q);
  void setFoilOnly(bool v) => state = state.copyWith(foilOnly: v);
  void setSort(CardSort s) => state = state.copyWith(sort: s);

  /// Start browsing a set with a fresh set of filters.
  void enterSet(String setName) => state = CardFilters(setName: setName);

  void clear() => state = CardFilters(setName: state.setName);
}

final searchResultsProvider = FutureProvider<List<CardModel>>((ref) async {
  final filters = ref.watch(searchFiltersProvider);
  // Sets can hold hundreds of printings; fetch enough to show the whole set.
  return ref.watch(cardRepositoryProvider).search(filters, limit: 1000);
});

// ---------------------------------------------------------------------------
// Collection & want lists
// ---------------------------------------------------------------------------
final collectionRepositoryProvider = Provider<CollectionRepository>(
    (ref) => CollectionRepository(ref.watch(sharedPreferencesProvider)));

class CollectionNotifier extends Notifier<List<CollectionEntry>> {
  @override
  List<CollectionEntry> build() =>
      ref.watch(collectionRepositoryProvider).load();

  void _persist() => ref.read(collectionRepositoryProvider).save(state);

  void add(CardModel card,
      {int quantity = 1, String condition = 'NM', bool isWanted = false}) {
    final idx = state.indexWhere(
        (e) => e.card.id == card.id && e.isWanted == isWanted);
    if (idx >= 0) {
      final existing = state[idx];
      final updated = [...state];
      updated[idx] = existing.copyWith(quantity: existing.quantity + quantity);
      state = updated;
    } else {
      state = [
        CollectionEntry(
          card: card,
          quantity: quantity,
          condition: condition,
          isWanted: isWanted,
          addedAt: DateTime.now(),
        ),
        ...state,
      ];
    }
    _persist();
  }

  void setQuantity(String cardId, bool isWanted, int quantity) {
    if (quantity <= 0) {
      remove(cardId, isWanted);
      return;
    }
    state = [
      for (final e in state)
        if (e.card.id == cardId && e.isWanted == isWanted)
          e.copyWith(quantity: quantity)
        else
          e
    ];
    _persist();
  }

  void setCondition(String cardId, bool isWanted, String condition) {
    state = [
      for (final e in state)
        if (e.card.id == cardId && e.isWanted == isWanted)
          e.copyWith(condition: condition)
        else
          e
    ];
    _persist();
  }

  void remove(String cardId, bool isWanted) {
    state = state
        .where((e) => !(e.card.id == cardId && e.isWanted == isWanted))
        .toList();
    _persist();
  }

  int quantityOf(String cardId, {bool isWanted = false}) => state
      .where((e) => e.card.id == cardId && e.isWanted == isWanted)
      .fold<int>(0, (s, e) => s + e.quantity);
}

final collectionProvider =
    NotifierProvider<CollectionNotifier, List<CollectionEntry>>(
        CollectionNotifier.new);

// ---------------------------------------------------------------------------
// Trade history (saved trades)
// ---------------------------------------------------------------------------
final tradeRepositoryProvider = Provider<TradeRepository>(
    (ref) => TradeRepository(ref.watch(sharedPreferencesProvider)));

class TradeHistoryNotifier extends Notifier<List<Trade>> {
  @override
  List<Trade> build() => ref.watch(tradeRepositoryProvider).load();

  void _persist() => ref.read(tradeRepositoryProvider).save(state);

  void addTrade(Trade trade) {
    state = [trade, ...state];
    _persist();
  }

  void remove(String id) {
    state = state.where((t) => t.id != id).toList();
    _persist();
  }
}

final tradeHistoryProvider =
    NotifierProvider<TradeHistoryNotifier, List<Trade>>(
        TradeHistoryNotifier.new);

// ---------------------------------------------------------------------------
// Live trade draft (the balancer)
// ---------------------------------------------------------------------------
class TradeDraftNotifier extends Notifier<Trade> {
  @override
  Trade build() {
    // Use read (not watch) so changing price settings does not wipe the draft.
    final pricing = ref.read(pricingProvider);
    return Trade(
      id: 'draft',
      createdAt: DateTime.now(),
      currencySymbol: pricing.symbol,
    );
  }

  void addCard(TradeSide side, CardModel card, {int quantity = 1}) {
    final pricing = ref.read(pricingProvider);
    final price = pricing.value(card) ?? 0;
    final items = side == TradeSide.have
        ? [...state.haveItems]
        : [...state.wantItems];
    final idx = items.indexWhere((i) => i.card.id == card.id);
    if (idx >= 0) {
      items[idx] =
          items[idx].copyWith(quantity: items[idx].quantity + quantity);
    } else {
      items.add(
          TradeItem(card: card, quantity: quantity, priceEach: price));
    }
    state = side == TradeSide.have
        ? state.copyWith(haveItems: items)
        : state.copyWith(wantItems: items);
  }

  void setQuantity(TradeSide side, String cardId, int quantity) {
    List<TradeItem> items = side == TradeSide.have
        ? [...state.haveItems]
        : [...state.wantItems];
    if (quantity <= 0) {
      items = items.where((i) => i.card.id != cardId).toList();
    } else {
      items = [
        for (final i in items)
          if (i.card.id == cardId) i.copyWith(quantity: quantity) else i
      ];
    }
    state = side == TradeSide.have
        ? state.copyWith(haveItems: items)
        : state.copyWith(wantItems: items);
  }

  void removeCard(TradeSide side, String cardId) {
    final items = (side == TradeSide.have ? state.haveItems : state.wantItems)
        .where((i) => i.card.id != cardId)
        .toList();
    state = side == TradeSide.have
        ? state.copyWith(haveItems: items)
        : state.copyWith(wantItems: items);
  }

  void setCash(TradeSide side, double amount) {
    state = side == TradeSide.have
        ? state.copyWith(haveCash: amount)
        : state.copyWith(wantCash: amount);
  }

  void setNotes(String notes) => state = state.copyWith(notes: notes);

  void clear() {
    final pricing = ref.read(pricingProvider);
    state = Trade(
      id: 'draft',
      createdAt: DateTime.now(),
      currencySymbol: pricing.symbol,
    );
  }
}

final tradeDraftProvider =
    NotifierProvider<TradeDraftNotifier, Trade>(TradeDraftNotifier.new);
