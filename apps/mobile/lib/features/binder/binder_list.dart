import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme.dart';
import '../../app/ui.dart';
import '../../app/widgets.dart';
import '../../core/data/card_repository.dart';
import '../../core/logic/free_limits.dart';
import '../../core/logic/binder_value_snapshot.dart';
import '../../core/logic/pricing.dart';
import '../../core/models/binder.dart';
import '../../core/models/binder_entry.dart';
import '../../core/providers.dart';
import '../card_detail/card_detail_screen.dart';
import '../paywall/pro_limits.dart';
import '../scan/scan_screen.dart';
import '../search/card_picker.dart';
import '../sync/sync_actions.dart';
import 'binder_grid.dart';

/// Existing Binder list chrome scoped to one [binderId].
class BinderList extends ConsumerStatefulWidget {
  const BinderList({super.key, required this.binderId, required this.pricing});

  final String binderId;
  final Pricing pricing;

  @override
  ConsumerState<BinderList> createState() => _BinderListState();
}

class _BinderListState extends ConsumerState<BinderList> {
  final _controller = TextEditingController();
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    setState(() {});
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      ref.read(binderFiltersProvider.notifier).setQuery(value);
    });
  }

  void _clearQuery() {
    _debounce?.cancel();
    _controller.clear();
    ref.read(binderFiltersProvider.notifier).setQuery('');
    setState(() {});
  }

  void _clearFilters() {
    _debounce?.cancel();
    _controller.clear();
    ref.read(binderFiltersProvider.notifier).clear();
    setState(() {});
  }

  Future<void> _onRefresh() => pullToRefreshAccountSync(ref);

  @override
  Widget build(BuildContext context) {
    final all = ownedInBinder(ref.watch(binderProvider), widget.binderId);
    final pricing = widget.pricing;

    if (all.isEmpty) {
      return RefreshIndicator(
        onRefresh: _onRefresh,
        child: _BinderEmptyState(
          onScan: () {
            if (context.mounted) ScanScreen.forBinder(context);
          },
          onSearch: () async {
            await CardPickerScreen.showMulti(
              context,
              title: 'Add to Binder',
              onPick: (card) => addToBinderOrUpsell(
                context,
                ref,
                card,
                binderId: widget.binderId,
                successMessage: 'Added ${card.name} to Binder',
              ),
            );
          },
        ),
      );
    }

    final filters = ref.watch(binderFiltersProvider);
    final visible = ref.watch(filteredBinderProvider);
    final binders = ref.watch(bindersProvider);
    final hasQuery = filters.query.trim().isNotEmpty;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 6),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  onChanged: _onChanged,
                  textInputAction: TextInputAction.search,
                  style: Theme.of(context).textTheme.bodyMedium,
                  decoration: InputDecoration(
                    isDense: true,
                    hintText: 'Search binder…',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    prefixIconConstraints: const BoxConstraints(
                      minWidth: 40,
                      minHeight: 36,
                    ),
                    suffixIcon: _controller.text.isEmpty
                        ? null
                        : IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: _clearQuery,
                            visualDensity: VisualDensity.compact,
                          ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 4),
              _BinderFilterControls(
                filters: filters,
                onFoilOnly: (v) =>
                    ref.read(binderFiltersProvider.notifier).setFoilOnly(v),
                onSort: (s) =>
                    ref.read(binderFiltersProvider.notifier).setSort(s),
                onClear: _clearFilters,
              ),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _onRefresh,
            child: visible.isEmpty
                ? _BinderNoMatches(
                    hasQuery: hasQuery || filters.hasActiveFilters,
                    onClear: _clearFilters,
                  )
                : ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.only(bottom: 96),
                    itemCount: visible.length,
                    separatorBuilder: (_, _) =>
                        const Divider(height: 1, indent: 72),
                    itemBuilder: (context, i) => _EntryRow(
                      entry: visible[i],
                      pricing: pricing,
                      binderId: widget.binderId,
                      liveBinders: binders,
                    ),
                  ),
          ),
        ),
      ],
    );
  }
}

class _BinderNoMatches extends StatelessWidget {
  const _BinderNoMatches({required this.hasQuery, required this.onClear});
  final bool hasQuery;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.search_off, size: 48, color: scheme.outline),
                  const SizedBox(height: 12),
                  Text(
                    hasQuery
                        ? 'No cards match your filters.'
                        : 'No cards in this Binder.',
                    textAlign: TextAlign.center,
                  ),
                  if (hasQuery) ...[
                    const SizedBox(height: 16),
                    TextButton(
                        onPressed: onClear, child: const Text('Clear filters')),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BinderEmptyState extends StatelessWidget {
  const _BinderEmptyState({required this.onScan, required this.onSearch});
  final VoidCallback onScan;
  final VoidCallback onSearch;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.menu_book_outlined,
                      size: 56, color: scheme.outline),
                  const SizedBox(height: 16),
                  Text('Your Binder is empty',
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  Text(
                    'Add the cards you\'re willing to trade. Scan a stack or '
                    'search by name — no separate chore.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: scheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    onPressed: onScan,
                    icon: const Icon(Icons.qr_code_scanner),
                    label: const Text('Scan cards'),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: onSearch,
                    icon: const Icon(Icons.search),
                    label: const Text('Add by search'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Compact foil / sort / clear controls that sit beside the binder search field.
class _BinderFilterControls extends StatelessWidget {
  const _BinderFilterControls({
    required this.filters,
    required this.onFoilOnly,
    required this.onSort,
    required this.onClear,
  });

  final CardFilters filters;
  final ValueChanged<bool> onFoilOnly;
  final ValueChanged<CardSort> onSort;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          tooltip: 'Foil only',
          isSelected: filters.foilOnly,
          onPressed: () => onFoilOnly(!filters.foilOnly),
          icon: const Icon(Icons.auto_awesome, size: 20),
          visualDensity: VisualDensity.compact,
          style: IconButton.styleFrom(
            foregroundColor: filters.foilOnly ? scheme.onPrimary : null,
            backgroundColor: filters.foilOnly ? scheme.primary : null,
          ),
        ),
        PopupMenuButton<CardSort>(
          tooltip: 'Sort',
          initialValue: filters.sort,
          onSelected: onSort,
          itemBuilder: (_) => CardSort.values
              .map((s) => PopupMenuItem(value: s, child: Text(s.label)))
              .toList(),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            child: Icon(
              Icons.sort,
              size: 20,
              color: filters.sort != CardSort.nameAsc
                  ? scheme.primary
                  : scheme.onSurfaceVariant,
            ),
          ),
        ),
        if (filters.hasActiveFilters)
          IconButton(
            tooltip: 'Clear filters',
            onPressed: onClear,
            icon: const Icon(Icons.filter_alt_off, size: 20),
            visualDensity: VisualDensity.compact,
          ),
      ],
    );
  }
}

class _EntryRow extends ConsumerWidget {
  const _EntryRow({
    required this.entry,
    required this.pricing,
    required this.binderId,
    required this.liveBinders,
  });
  final BinderEntry entry;
  final Pricing pricing;
  final String binderId;
  final List<Binder> liveBinders;

  Future<void> _move(BuildContext context, WidgetRef ref) async {
    final dests = Binder.gridOrder(liveBinders)
        .where((b) => b.isLive && b.clientId != binderId)
        .toList();
    if (dests.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No other Binder to move into')),
      );
      return;
    }
    final dest = await showModalBottomSheet<Binder>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const ListTile(title: Text('Move to Binder')),
            for (final binder in dests)
              ListTile(
                key: Key('moveDest-${binder.clientId}'),
                title: Text(binder.name),
                onTap: () => Navigator.pop(ctx, binder),
              ),
          ],
        ),
      ),
    );
    if (dest == null || !context.mounted) return;
    var qty = entry.quantity;
    if (entry.quantity > 1) {
      final picked = await showDialog<int>(
        context: context,
        builder: (ctx) => _MoveQtyDialog(max: entry.quantity),
      );
      if (picked == null || !context.mounted) return;
      qty = picked;
    }
    final result = ref.read(binderProvider.notifier).moveCopies(
          printingId: entry.card.id,
          fromBinderId: binderId,
          toBinderId: dest.clientId,
          quantity: qty,
          condition: entry.condition,
        );
    if (!result.ok && context.mounted) {
      final message = switch (result.reason) {
        'binder-cards-cap' =>
          'This Binder already holds ${FreeLimits.binderCards} cards on the free plan.',
        _ => result.reason ?? 'Could not move',
      };
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
    }
  }

  /// Removes this row and offers Undo, since a swipe or a stray − is easy.
  void _removeWithUndo(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(binderProvider.notifier);
    final removed = ref
        .read(binderProvider)
        .where((e) =>
            !e.isWanted &&
            e.card.id == entry.card.id &&
            e.resolvedBinderId == binderId &&
            e.condition == entry.condition)
        .toList();
    notifier.remove(
      entry.card.id,
      entry.isWanted,
      binderId: binderId,
      condition: entry.condition,
    );
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(
        key: const Key('binderRemovedSnack'),
        content: Text('Removed ${entry.card.name}'),
        action: SnackBarAction(
          key: const Key('binderRemovedUndo'),
          label: 'Undo',
          onPressed: () => notifier.restore(removed),
        ),
      ));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final notifier = ref.read(binderProvider.notifier);
    final card = entry.card;
    final unit = pricing.value(card);
    // Unpriced reads `—`, matching the Binder tile and the web list.
    final lineLabel = isPricedField(unit)
        ? pricing.formatValue(unit! * entry.quantity)
        : '—';
    final dests = Binder.gridOrder(liveBinders)
        .where((b) => b.isLive && b.clientId != binderId)
        .toList();

    return Dismissible(
      key: ValueKey(
          '${card.id}_${entry.isWanted}_${entry.resolvedBinderId}_${entry.condition}'),
      direction: DismissDirection.endToStart,
      background: Container(
        color: context.tokens.loss,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: (_) => _removeWithUndo(context, ref),
      child: InkWell(
        onTap: () => Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => CardDetailScreen(card: card))),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Row(
            children: [
              CardThumbnail(url: card.imageUrl, foil: card.isFoil),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(card.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 3),
                    CardMetaLine(card: card),
                    const SizedBox(height: 5),
                    Wrap(
                      spacing: 5,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        RarityBadge(rarity: card.rarity),
                        if (card.isFoil)
                          FoilTag(subTypeName: card.subTypeName, label: card.finishLabel),
                        _ConditionChip(
                          condition: entry.condition,
                          onChanged: (c) => notifier.setCondition(
                            card.id,
                            entry.isWanted,
                            c,
                            binderId: binderId,
                            condition: entry.condition,
                          ),
                        ),
                        if (dests.isNotEmpty)
                          TextButton(
                            key: Key('moveBinder-${card.id}'),
                            style: TextButton.styleFrom(
                              visualDensity: VisualDensity.compact,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 8),
                              minimumSize: Size.zero,
                            ),
                            onPressed: () => _move(context, ref),
                            child: const Text('Move'),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(lineLabel,
                      key: Key('binderRowValue-${card.id}'),
                      style: theme.textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.w800)),
                  if (pricing.lowPriceLabel(card) != null)
                    Text(pricing.lowPriceLabel(card)!,
                        style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant)),
                  const SizedBox(height: 4),
                  _MiniStepper(
                    qty: entry.quantity,
                    onInc: () => notifier.setQuantity(
                      card.id,
                      entry.isWanted,
                      entry.quantity + 1,
                      binderId: binderId,
                      condition: entry.condition,
                    ),
                    onDec: () => entry.quantity <= 1
                        ? _removeWithUndo(context, ref)
                        : notifier.setQuantity(
                            card.id,
                            entry.isWanted,
                            entry.quantity - 1,
                            binderId: binderId,
                            condition: entry.condition,
                          ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MoveQtyDialog extends StatefulWidget {
  const _MoveQtyDialog({required this.max});
  final int max;

  @override
  State<_MoveQtyDialog> createState() => _MoveQtyDialogState();
}

class _MoveQtyDialogState extends State<_MoveQtyDialog> {
  late int _qty = widget.max;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Move copies'),
      content: Row(
        children: [
          IconButton(
            onPressed: _qty > 1 ? () => setState(() => _qty--) : null,
            icon: const Icon(Icons.remove),
          ),
          Text('$_qty', key: const Key('moveQty')),
          IconButton(
            onPressed: _qty < widget.max ? () => setState(() => _qty++) : null,
            icon: const Icon(Icons.add),
          ),
        ],
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel')),
        FilledButton(
          onPressed: () => Navigator.pop(context, _qty),
          child: const Text('Move'),
        ),
      ],
    );
  }
}

class _ConditionChip extends StatelessWidget {
  const _ConditionChip({required this.condition, required this.onChanged});
  final String condition;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return PopupMenuButton<String>(
      onSelected: onChanged,
      itemBuilder: (_) => BinderEntry.conditions
          .map((c) => PopupMenuItem(value: c, child: Text(c)))
          .toList(),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: scheme.secondaryContainer,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(condition,
                style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    color: scheme.onSecondaryContainer)),
            Icon(Icons.arrow_drop_down,
                size: 14, color: scheme.onSecondaryContainer),
          ],
        ),
      ),
    );
  }
}

class _MiniStepper extends StatelessWidget {
  const _MiniStepper(
      {required this.qty, required this.onInc, required this.onDec});
  final int qty;
  final VoidCallback onInc;
  final VoidCallback onDec;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          InkWell(
            onTap: onDec,
            child: const Padding(
                padding: EdgeInsets.all(5), child: Icon(Icons.remove, size: 15)),
          ),
          SizedBox(
            width: 20,
            child: Text('$qty',
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontWeight: FontWeight.w700, fontSize: 13)),
          ),
          InkWell(
            onTap: onInc,
            child: const Padding(
                padding: EdgeInsets.all(5), child: Icon(Icons.add, size: 15)),
          ),
        ],
      ),
    );
  }
}
