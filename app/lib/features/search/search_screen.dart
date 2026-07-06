import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/app.dart';
import '../../app/card_actions.dart';
import '../../app/widgets.dart';
import '../../core/data/card_repository.dart';
import '../../core/providers.dart';
import '../card_detail/card_detail_screen.dart';

/// Top-level Browse tab: pick a set, then drill into its cards.
class BrowseScreen extends ConsumerWidget {
  const BrowseScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sets = CardRepository.setNames;
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Browse'),
        actions: const [SettingsAction()],
      ),
      body: ListView.separated(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: sets.length,
        separatorBuilder: (_, _) => const Divider(height: 1, indent: 72),
        itemBuilder: (context, i) {
          final set = sets[i];
          return ListTile(
            leading: CircleAvatar(
              backgroundColor: scheme.primaryContainer,
              child: Icon(Icons.style_outlined,
                  color: scheme.onPrimaryContainer),
            ),
            title: Text(set,
                style: const TextStyle(fontWeight: FontWeight.w600)),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              ref.read(searchFiltersProvider.notifier).enterSet(set);
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => SetCardsScreen(setName: set),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

/// Cards within a single set, with search / foil / sort and pull-to-refresh.
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

  /// Pull-to-refresh: re-query Supabase so the latest synced prices show up.
  Future<void> _refresh() async {
    ref.invalidate(searchResultsProvider);
    await ref.read(searchResultsProvider.future);
  }

  @override
  Widget build(BuildContext context) {
    final results = ref.watch(searchResultsProvider);
    final filters = ref.watch(searchFiltersProvider);
    final pricing = ref.watch(pricingProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.setName),
        actions: const [SettingsAction()],
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
                hintText: 'Search in ${widget.setName}…',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _controller.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _controller.clear();
                          ref
                              .read(searchFiltersProvider.notifier)
                              .setQuery('');
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
                    const Center(child: CircularProgressIndicator()),
                error: (e, _) => _ScrollableCenter(
                  child: _ErrorView(
                    message: e.toString(),
                    onRetry: () => ref.invalidate(searchResultsProvider),
                  ),
                ),
                data: (cards) {
                  if (cards.isEmpty) {
                    return const _ScrollableCenter(child: _EmptyView());
                  }
                  return ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.only(bottom: 16),
                    itemCount: cards.length,
                    separatorBuilder: (_, _) =>
                        const Divider(height: 1, indent: 72),
                    itemBuilder: (context, i) {
                      final card = cards[i];
                      return CardRow(
                        card: card,
                        priceLabel: pricing.priceLabel(card),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => CardDetailScreen(card: card),
                          ),
                        ),
                        onAdd: () => showCardActions(context, ref, card),
                      );
                    },
                  );
                },
              ),
            ),
          ),
        ],
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
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        children: [
          FilterChip(
            label: const Text('Foil'),
            avatar: const Icon(Icons.auto_awesome, size: 16),
            selected: filters.foilOnly,
            onSelected: notifier.setFoilOnly,
          ),
          const SizedBox(width: 8),
          _DropChip<CardSort>(
            label: 'Sort',
            selected: filters.sort != CardSort.nameAsc,
            value: filters.sort,
            icon: Icons.sort,
            items: CardSort.values
                .map((s) =>
                    PopupMenuItem(value: s, child: Text(s.label)))
                .toList(),
            onSelected: notifier.setSort,
          ),
          if (filters.hasActiveFilters) ...[
            const SizedBox(width: 8),
            ActionChip(
              label: const Text('Clear'),
              avatar: const Icon(Icons.close, size: 16),
              onPressed: notifier.clear,
            ),
          ],
        ],
      ),
    );
  }
}

class _DropChip<T> extends StatelessWidget {
  const _DropChip({
    required this.label,
    required this.selected,
    required this.value,
    required this.items,
    required this.onSelected,
    this.icon,
  });

  final String label;
  final bool selected;
  final T value;
  final List<PopupMenuEntry<T>> items;
  final ValueChanged<T> onSelected;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return PopupMenuButton<T>(
      initialValue: value,
      onSelected: onSelected,
      itemBuilder: (_) => items,
      child: Chip(
        backgroundColor: selected ? scheme.primaryContainer : null,
        label: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[Icon(icon, size: 16), const SizedBox(width: 4)],
            Text(label),
            const Icon(Icons.arrow_drop_down, size: 18),
          ],
        ),
      ),
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
          Text('Could not load cards.\n$message',
              textAlign: TextAlign.center),
          const SizedBox(height: 16),
          FilledButton.tonal(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}
