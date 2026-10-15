import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../app/card_filter_bar.dart';
import '../../app/theme.dart';
import '../../app/ui.dart';
import '../../app/widgets.dart';
import '../../core/data/card_repository.dart';
import '../../core/data/set_logo_cache.dart';
import '../../core/data/set_logos.dart';
import '../../core/data/set_published_on.dart';
import '../../core/logic/set_sort.dart';
import '../../core/models/card_model.dart';
import '../../core/providers.dart';
import '../card_detail/card_detail_screen.dart';
import '../scan/scan_screen.dart';
import 'home_dashboard.dart';
import 'trends_screen.dart';

/// Top-level Browse tab: a global search bar over every set, the personal
/// dashboard, then a grid of sets to drill into. Searching short-circuits the set list and shows every
/// printing (finish / art / set variant) as its own row across the catalog.
class BrowseScreen extends ConsumerStatefulWidget {
  const BrowseScreen({super.key});

  @override
  ConsumerState<BrowseScreen> createState() => _BrowseScreenState();
}

class _BrowseScreenState extends ConsumerState<BrowseScreen> {
  final _controller = TextEditingController();
  Timer? _debounce;
  String _query = '';

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    setState(() {}); // refresh clear button
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 250), () {
      setState(() => _query = value.trim());
    });
  }

  void _clear() {
    _controller.clear();
    _debounce?.cancel();
    setState(() => _query = '');
  }

  Future<void> _refresh() => refreshPricesWithToast(context, ref);

  @override
  Widget build(BuildContext context) {
    final searching = _query.isNotEmpty;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Browse'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            tooltip: 'Scan a card',
            onPressed: () => Navigator.of(
              context,
            ).push(MaterialPageRoute(builder: (_) => const ScanScreen())),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
            child: TextField(
              controller: _controller,
              onChanged: _onChanged,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: 'Search all cards…',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _controller.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: _clear,
                      ),
              ),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _refresh,
              child: searching
                  ? _GlobalSearchResults(query: _query)
                  : const _SetList(),
            ),
          ),
        ],
      ),
    );
  }
}

/// The list of sets to drill into (shown when the global search is empty).
class _SetList extends ConsumerStatefulWidget {
  const _SetList();

  @override
  ConsumerState<_SetList> createState() => _SetListState();
}

class _SetListState extends ConsumerState<_SetList> {
  var _memoryPrecacheStarted = false;

  void _precacheLogosIfNeeded(SetLogoMap logos) {
    if (_memoryPrecacheStarted || logos.isEmpty) return;
    _memoryPrecacheStarted = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      SetLogoCache.precacheIntoMemory(
        context,
        logos.urls,
        onCached: SetLogoTitle.markWarm,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final catalog = ref.watch(catalogProvider);
    final logos =
        ref.watch(setLogoMapProvider).asData?.value ?? SetLogoMap.empty;
    final publishedOn =
        ref.watch(setPublishedOnMapProvider).asData?.value ??
        SetPublishedOnMap.empty;
    _precacheLogosIfNeeded(logos);
    return catalog.when(
      loading: () => const Center(child: CircularProgressIndicator.adaptive()),
      error: (e, _) => _ScrollableCenter(
        child: _ErrorView(
          message: e.toString(),
          onRetry: () => ref.invalidate(catalogProvider),
        ),
      ),
      data: (cards) {
        final setIds = <String, int>{};
        for (final c in cards) {
          if (isNonCardProduct(c)) continue;
          final s = c.setName;
          if (s == null) continue;
          final id = c.setId;
          if (id != null) setIds.putIfAbsent(s, () => id);
        }
        final sets = CardRepository.setNamesFrom(
          cards,
          publishedOnForGroupId: publishedOn.forGroupId,
        );
        if (sets.isEmpty) {
          return const _ScrollableCenter(child: _EmptyView());
        }

        // Group sets by browse tier, each tier a grid of logo tiles.
        final groups = <({String label, List<_BrowseSetRow> sets})>[];
        int? lastTier;
        for (final set in sets) {
          final tier = setBrowseTier(set);
          if (tier != lastTier) {
            groups.add((label: browseTierLabel(tier), sets: <_BrowseSetRow>[]));
            lastTier = tier;
          }
          groups.last.sets.add(
            _BrowseSetRow(
              setName: set,
              logoUrl: logos.urlForGroupId(setIds[set]),
            ),
          );
        }

        final bottomPad = 16 + MediaQuery.paddingOf(context).bottom + 80;
        return CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            const SliverToBoxAdapter(child: HomeDashboard()),
            const SliverToBoxAdapter(child: SeeTrendingTile()),
            for (final group in groups) ...[
              SliverToBoxAdapter(
                child: SectionTitle(group.label, count: group.sets.length),
              ),
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverGrid.builder(
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 220,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    mainAxisExtent: 116,
                  ),
                  itemCount: group.sets.length,
                  itemBuilder: (context, i) {
                    final row = group.sets[i];
                    return _SetTile(
                      key: ValueKey<String>(row.setName),
                      setName: row.setName,
                      logoUrl: row.logoUrl,
                    );
                  },
                ),
              ),
            ],
            SliverToBoxAdapter(child: SizedBox(height: bottomPad)),
          ],
        );
      },
    );
  }
}

class _BrowseSetRow {
  const _BrowseSetRow({required this.setName, required this.logoUrl});
  final String setName;
  final String? logoUrl;
}

/// One browsable set row. Kept alive so logos stay mounted while scrolling.
class _SetTile extends ConsumerStatefulWidget {
  const _SetTile({super.key, required this.setName, required this.logoUrl});

  final String setName;
  final String? logoUrl;

  @override
  ConsumerState<_SetTile> createState() => _SetTileState();
}

class _SetTileState extends ConsumerState<_SetTile>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final theme = Theme.of(context);
    final t = context.tokens;
    return Panel(
      onTap: () {
        ref.read(searchFiltersProvider.notifier).enterSet(widget.setName);
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => SetCardsScreen(setName: widget.setName),
          ),
        );
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            height: 64,
            color: t.sunken,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            alignment: Alignment.center,
            child: widget.logoUrl == null || widget.logoUrl!.isEmpty
                ? Text(
                    widget.setName
                        .substring(0, widget.setName.length.clamp(0, 3))
                        .toUpperCase(),
                    style: AppType.display(
                      TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.4,
                        color: t.textFaint,
                      ),
                    ),
                  )
                : Center(
                    child: SetLogoTitle(
                      setName: widget.setName,
                      logoUrl: widget.logoUrl,
                    ),
                  ),
          ),
          Divider(height: 1, color: t.border),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  widget.setName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleSmall,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Flat printing results for a global (all-sets) query typed in the Browse
/// search bar — each finish / art / set variant is its own selectable row.
class _GlobalSearchResults extends ConsumerWidget {
  const _GlobalSearchResults({required this.query});
  final String query;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final catalog = ref.watch(catalogProvider);
    return catalog.when(
      loading: () => const Center(child: CircularProgressIndicator.adaptive()),
      error: (e, _) => _ScrollableCenter(
        child: _ErrorView(
          message: e.toString(),
          onRetry: () => ref.invalidate(catalogProvider),
        ),
      ),
      data: (all) {
        final cards = filterCards(all, CardFilters(query: query));
        if (cards.isEmpty) {
          return const _ScrollableCenter(child: _EmptyView());
        }
        return _CardList(cards: cards);
      },
    );
  }
}

/// Cards within a single set — one row per printing — with search / foil /
/// sort and pull-to-refresh.
class SetCardsScreen extends ConsumerStatefulWidget {
  const SetCardsScreen({super.key, required this.setName});

  final String setName;

  @override
  ConsumerState<SetCardsScreen> createState() => _SetCardsScreenState();
}

class _SetCardsScreenState extends ConsumerState<SetCardsScreen> {
  final _controller = TextEditingController();
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    setState(() {}); // refresh clear button
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      ref.read(searchFiltersProvider.notifier).setQuery(value);
    });
  }

  /// Pull-to-refresh: re-query Supabase so the latest synced prices show up,
  /// then toast when the pipeline last updated pricing.
  Future<void> _refresh() => refreshPricesWithToast(context, ref);

  @override
  Widget build(BuildContext context) {
    final results = ref.watch(browseResultsProvider);
    final filters = ref.watch(searchFiltersProvider);

    return Scaffold(
      appBar: AppBar(title: Text(widget.setName)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
            child: TextField(
              controller: _controller,
              onChanged: _onChanged,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: 'Search in ${widget.setName}…',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _controller.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _controller.clear();
                          ref.read(searchFiltersProvider.notifier).setQuery('');
                          setState(() {});
                        },
                      ),
              ),
            ),
          ),
          _FilterBar(filters: filters),
          const SizedBox(height: 4),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _refresh,
              child: results.when(
                loading: () =>
                    const Center(child: CircularProgressIndicator.adaptive()),
                error: (e, _) => _ScrollableCenter(
                  child: _ErrorView(
                    message: e.toString(),
                    onRetry: () => ref.invalidate(catalogProvider),
                  ),
                ),
                data: (list) {
                  if (list.isEmpty) {
                    return const _ScrollableCenter(child: _EmptyView());
                  }
                  return _CardList(cards: list);
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Refreshes the catalog from Supabase, then shows a toast noting when the
/// pricing pipeline last refreshed prices (and from which marketplace).
Future<void> refreshPricesWithToast(BuildContext context, WidgetRef ref) async {
  try {
    await ref.read(catalogProvider.notifier).refresh();
  } catch (_) {
    if (context.mounted) {
      ScaffoldMessenger.of(context)
        ..clearSnackBars()
        ..showSnackBar(
          const SnackBar(
            behavior: SnackBarBehavior.floating,
            content: Text('Could not refresh prices. Check your connection.'),
          ),
        );
    }
    return;
  }
  if (!context.mounted) return;
  final updatedAt = ref.read(priceUpdatedAtProvider);
  final source = ref.read(pricingProvider).sourceLabel;
  ScaffoldMessenger.of(context)
    ..clearSnackBars()
    ..showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 3),
        content: Row(
          children: [
            Icon(
              Icons.schedule,
              size: 18,
              color: Theme.of(context).colorScheme.onInverseSurface,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text('${_priceUpdatedLabel(updatedAt)} · $source pricing'),
            ),
          ],
        ),
      ),
    );
}

/// A short, human "prices updated …" phrase from the pipeline timestamp.
String _priceUpdatedLabel(DateTime? updatedAt) {
  if (updatedAt == null) return 'Prices refreshed';
  final local = updatedAt.toLocal();
  final diff = DateTime.now().difference(local);
  final String when;
  if (diff.inMinutes < 1) {
    when = 'just now';
  } else if (diff.inMinutes < 60) {
    when = '${diff.inMinutes}m ago';
  } else if (diff.inHours < 24) {
    when = '${diff.inHours}h ago';
  } else if (diff.inDays == 1) {
    when = 'yesterday';
  } else if (diff.inDays < 7) {
    when = '${diff.inDays}d ago';
  } else {
    when = DateFormat('MMM d').format(local);
  }
  return 'Prices updated $when';
}

/// A scrollable list of individual printings, shared by the set view and
/// global search. Each row opens detail on that exact version.
class _CardList extends StatelessWidget {
  const _CardList({required this.cards});
  final List<CardModel> cards;

  @override
  Widget build(BuildContext context) {
    // Clear the system home indicator, and when this list sits under the shell
    // NavigationBar (global search) also clear that chrome.
    final underShellNav = !Navigator.of(context).canPop();
    final bottomPad =
        16 + MediaQuery.paddingOf(context).bottom + (underShellNav ? 80 : 0);
    return Column(
      children: [
        const _PriceColumnsHeader(),
        Expanded(
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: EdgeInsets.only(bottom: bottomPad),
            itemCount: cards.length,
            separatorBuilder: (_, _) => const Divider(height: 1, indent: 16),
            itemBuilder: (context, i) => _CardTile(card: cards[i]),
          ),
        ),
      ],
    );
  }
}

/// Column headings over a printing list, like the web set table: the card
/// on the left, the marketplace the prices come from on the right.
class _PriceColumnsHeader extends ConsumerWidget {
  const _PriceColumnsHeader();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.tokens;
    final source = ref.watch(pricingProvider).sourceLabel;
    final style = Theme.of(
      context,
    ).textTheme.labelSmall?.copyWith(color: t.textMuted, letterSpacing: 0.6);
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 48, 8),
      decoration: BoxDecoration(
        color: t.sunken,
        border: Border.symmetric(horizontal: BorderSide(color: t.border)),
      ),
      child: Row(
        children: [
          Expanded(child: Text('CARD', style: style)),
          Text('${source.toUpperCase()} PRICE', style: style),
        ],
      ),
    );
  }
}

/// One printing in the browse list. Tapping opens the card detail screen on
/// that exact version (finish / art / set variant).
class _CardTile extends ConsumerWidget {
  const _CardTile({required this.card});
  final CardModel card;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pricing = ref.watch(pricingProvider);

    void openDetail() => Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => CardDetailScreen(card: card)));

    return CardRow(
      card: card,
      priceLabel: pricing.priceLabel(card),
      secondaryLabel: pricing.lowPriceLabel(card),
      showThumbnail: false,
      inlineBadges: true,
      onTap: openDetail,
      trailing: Icon(
        Icons.chevron_right,
        color: Theme.of(context).colorScheme.onSurfaceVariant,
      ),
    );
  }
}

class _FilterBar extends ConsumerWidget {
  const _FilterBar({required this.filters});
  final CardFilters filters;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(searchFiltersProvider.notifier);
    return CardFilterBar(
      filters: filters,
      onFoilOnly: notifier.setFoilOnly,
      onSort: notifier.setSort,
      onClear: notifier.clear,
    );
  }
}

/// Wraps a centered widget in an always-scrollable view so pull-to-refresh
/// still works when the list is empty or errored.
class _ScrollableCenter extends StatelessWidget {
  const _ScrollableCenter({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Center(child: child),
        ),
      ),
    );
  }
}

class _EmptyView extends StatelessWidget {
  const _EmptyView();
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.search_off, size: 48, color: scheme.outline),
        const SizedBox(height: 12),
        const Text('No cards match your filters.'),
      ],
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.cloud_off, size: 44),
          const SizedBox(height: 12),
          Text('Could not load cards.\n$message', textAlign: TextAlign.center),
          const SizedBox(height: 16),
          FilledButton.tonal(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}
