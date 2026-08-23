/// Free-tier ceilings. RiftTrades Pro removes all of them.
///
/// The numbers live here as the single source for the mobile app (see
/// `docs/port/CONVENTIONS.md`). Saved trades are a rolling window: confirming
/// a trade is never refused, and the oldest rows drop off instead.
class FreeLimits {
  const FreeLimits._();

  /// Distinct owned Printings **in one Binder**. Raising the quantity of a
  /// card that's already in that Binder is never capped. The same Printing in
  /// two Binders counts as 1 in each.
  static const binderCards = 50;

  /// Distinct cards a free want list holds.
  static const wantListCards = 25;

  /// Live Binder records a free account may hold (Trade Binder and Collection
  /// count). Creating a 5th presents the Pro upgrade and writes nothing.
  static const binders = 4;

  /// Cards currently lent out across all lend groups.
  ///
  /// Counted by quantity, not distinct titles — lending two copies is two
  /// loaned cards. Borrowing is uncapped: the limit is on what you have out.
  static const loanedCards = 25;

  /// Trades a free account keeps.
  ///
  /// Confirming a trade is never blocked — the binder reconciliation it
  /// performs is core to the app, and refusing it would lose real information.
  /// History is a rolling window instead: the oldest entry drops off.
  static const savedTrades = 3;

  static int cardsFor({required bool isWanted}) =>
      isWanted ? wantListCards : binderCards;

  /// Whether a free account may add another distinct owned Printing.
  ///
  /// [existingDistinctCount] is distinct `card_id` among live owned entries
  /// **in that Binder** (caller scopes the count). Pro always allowed. Want
  /// List uses [wantListCards].
  static bool canAddDistinctCard(
    int existingDistinctCount, {
    required bool isWanted,
    required bool isPro,
  }) {
    if (isPro) return true;
    return existingDistinctCount < cardsFor(isWanted: isWanted);
  }

  /// Whether a free account may create another Binder. Pro always allowed.
  /// Behaviour at the cap is paywall — callers present Pro and create nothing.
  static bool canCreateBinder(int liveBinderCount, {required bool isPro}) {
    if (isPro) return true;
    return liveBinderCount < binders;
  }
}

/// How much of the free tier is currently in use, for upsell copy.
class FreeUsage {
  const FreeUsage({
    required this.binderCards,
    required this.wantListCards,
    required this.loanedCards,
    required this.savedTrades,
    this.binders = 0,
  });

  final int binderCards;
  final int wantListCards;
  final int loanedCards;
  final int savedTrades;
  final int binders;

  /// The cap closest to being reached, as a 0–1 fraction. Drives whether the
  /// upgrade prompt mentions limits at all.
  double get pressure => [
        binderCards / FreeLimits.binderCards,
        wantListCards / FreeLimits.wantListCards,
        loanedCards / FreeLimits.loanedCards,
        savedTrades / FreeLimits.savedTrades,
        binders / FreeLimits.binders,
      ].reduce((a, b) => a > b ? a : b);

  /// True once any cap is within a few entries, which is when nudging is
  /// useful rather than noise.
  bool get isNearAnyLimit => pressure >= 0.7;
}
