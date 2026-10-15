import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:showcaseview/showcaseview.dart';

import '../../app/theme.dart';
import '../../core/logic/binder_names.dart';
import '../../core/logic/free_limits.dart';
import '../../core/models/binder.dart';
import '../../core/models/binder_entry.dart';
import '../../core/models/trade.dart';
import '../../core/providers.dart';
import '../onboarding/onboarding_keys.dart';
import '../onboarding/onboarding_provider.dart';
import '../onboarding/onboarding_repository.dart';
import '../onboarding/showcase_theme.dart';
import '../onboarding/tour_controller.dart';
import '../onboarding/tour_copy.dart';
import '../paywall/pro_limits.dart';
import '../paywall/pro_paywall.dart';
import '../scan/scan_screen.dart';
import '../search/card_picker.dart';
import '../want_list/want_list_screen.dart';
import 'binder_grid.dart';
import 'binder_list.dart';
import 'binder_value_sheet.dart';

class BinderScreen extends ConsumerStatefulWidget {
  const BinderScreen({super.key});

  @override
  ConsumerState<BinderScreen> createState() => _BinderScreenState();
}

class _BinderScreenState extends ConsumerState<BinderScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab = TabController(length: 2, vsync: this);
  bool _wantTourStarted = false;

  @override
  void initState() {
    super.initState();
    _tab.addListener(_onTabChanged);
  }

  void _onTabChanged() {
    if (_tab.indexIsChanging) return;
    setState(() {});
    if (_tab.index == 1) _maybeStartWantListTour();
  }

  void _maybeStartWantListTour() {
    if (_wantTourStarted) return;
    if (ref.read(onboardingProvider).contains(OnboardingTourId.wantList)) {
      return;
    }

    final home = ShowcaseView.getNamed(OnboardingKeys.homeScope);
    if (home.isShowcaseRunning) return;

    _wantTourStarted = true;
    final hasCards =
        ref.read(binderProvider).any((e) => e.isWanted && e.quantity > 0);
    final tours = TourController(ref);
    final keys = tours.wantListKeys(hasCards: hasCards);

    late final void Function(GlobalKey?) onDismiss;
    void finishTour() {
      tours.markSeen(OnboardingTourId.wantList);
      home.removeOnFinishCallback(finishTour);
      home.removeOnDismissCallback(onDismiss);
    }

    onDismiss = (GlobalKey? _) => finishTour();

    home.addOnFinishCallback(finishTour);
    home.addOnDismissCallback(onDismiss);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _tab.index != 1) {
        finishTour();
        return;
      }
      tours.startHomeTour(keys);
    });
  }

  @override
  void dispose() {
    _tab.removeListener(_onTabChanged);
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final entries = ref.watch(binderProvider);
    final binders = ref.watch(bindersProvider);
    final pricing = ref.watch(pricingProvider);
    final openId = ref.watch(openBinderIdProvider);
    final wanted = entries.where((e) => e.isWanted).toList();
    final owned = entries.where((e) => !e.isWanted).toList();
    final onBinderTab = _tab.index == 0;
    final inBinder = onBinderTab && openId != null;
    final openRows = openId == null
        ? const <BinderEntry>[]
        : ownedInBinder(owned, openId);
    final valueLabel = openId == null
        ? ''
        : binderTileValueLabel(owned, openId, pricing);
    final title = _appBarTitle(
      onBinderTab: onBinderTab,
      openId: openId,
      binders: binders,
    );
    final selection = ref.watch(binderSelectionProvider);
    final selecting = inBinder && selection.isNotEmpty;
    final selectionBar = selecting
        ? _SelectionActionBar(
            canMove: Binder.gridOrder(binders)
                .any((b) => b.isLive && b.clientId != openId),
            onMove: () => _moveSelected(context),
            onTrade: () => _tradeSelected(context),
            onRemove: () => _removeSelected(context),
          )
        : null;

    return PopScope(
      // Back leaves selection mode before it leaves the screen.
      canPop: !selecting,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) ref.read(binderSelectionProvider.notifier).clear();
      },
      child: Scaffold(
      appBar: selecting
          ? _selectionAppBar(selection)
          : AppBar(
        leading: inBinder
            ? IconButton(
                key: const Key('binderBackToGrid'),
                icon: const Icon(Icons.arrow_back),
                tooltip: 'Back to Binders',
                onPressed: () {
                  ref.read(binderFiltersProvider.notifier).clear();
                  ref.read(openBinderIdProvider.notifier).close();
                },
              )
            : null,
        title: Text(title, key: const Key('binderHomeTitle')),
        actions: [
          if (onBinderTab && openId == null)
            TextButton.icon(
              key: const Key('createBinder'),
              onPressed: () => _createBinder(context),
              icon: const Icon(Icons.add_box_outlined),
              label: const Text('New'),
            ),
        ],
        bottom: inBinder
            ? null
            : PreferredSize(
                preferredSize: const Size.fromHeight(46),
                child: ShowcaseTheme.mark(
                  key: OnboardingKeys.binderTabs,
                  title: TourCopy.binderTabsTitle,
                  description: TourCopy.binderTabsBody,
                  child: TabBar(
                    controller: _tab,
                    tabs: [
                      Tab(text: 'Binder (${_count(owned)})'),
                      Tab(text: 'Want List (${_count(wanted)})'),
                    ],
                  ),
                ),
              ),
      ),
      body: TabBarView(
        controller: _tab,
        physics: inBinder ? const NeverScrollableScrollPhysics() : null,
        children: [
          openId == null
              ? BinderGrid(
                  onOpen: (id) {
                    ref.read(binderFiltersProvider.notifier).clear();
                    ref.read(openBinderIdProvider.notifier).open(id);
                  },
                  onRename: (id) => _renameBinder(context, id),
                  onDelete: (id) => _deleteBinder(context, id),
                )
              : BinderList(binderId: openId, pricing: pricing),
          WantListPane(
            onAdd: () => _addBySearch(isWanted: true),
          ),
        ],
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      floatingActionButton: selectionBar ?? Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: SizedBox(
          width: MediaQuery.sizeOf(context).width - 32,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (onBinderTab && openId != null && openRows.isNotEmpty)
                ShowcaseTheme.mark(
                  key: OnboardingKeys.binderTotal,
                  title: TourCopy.binderTotalTitle,
                  description: TourCopy.binderTotalBody,
                  child: _BinderValueChip(
                    total: valueLabel,
                    onTap: () => showBinderValueSheet(context),
                  ),
                )
              else
                const SizedBox.shrink(),
              ShowcaseTheme.mark(
                key: OnboardingKeys.binderFab,
                title: TourCopy.binderFabTitle,
                description: TourCopy.binderFabBody,
                child: FloatingActionButton.extended(
                  heroTag: 'binderFab',
                  onPressed: () => onBinderTab
                      ? _showBinderAddOptions(context)
                      : _addBySearch(isWanted: true),
                  icon: const Icon(Icons.add),
                  label: Text(onBinderTab ? 'Add card' : 'Add want'),
                ),
              ),
            ],
          ),
        ),
      ),
      ),
    );
  }

  PreferredSizeWidget _selectionAppBar(Set<String> selection) {
    final visibleKeys =
        ref.read(filteredBinderProvider).map(binderRowKey).toList();
    final allSelected = visibleKeys.every(selection.contains);
    final notifier = ref.read(binderSelectionProvider.notifier);
    return AppBar(
      leading: IconButton(
        key: const Key('binderSelectionClose'),
        icon: const Icon(Icons.close),
        tooltip: 'Cancel selection',
        onPressed: notifier.clear,
      ),
      title: Text(
        '${selection.length} selected',
        key: const Key('binderSelectionCount'),
      ),
      actions: [
        TextButton(
          key: const Key('binderSelectAll'),
          onPressed: allSelected ? null : () => notifier.selectAll(visibleKeys),
          child: const Text('Select all'),
        ),
      ],
    );
  }

  /// Selected rows as they are now, so actions see current quantities.
  List<BinderEntry> _selectedRows() {
    final openId = ref.read(openBinderIdProvider);
    if (openId == null) return const [];
    final keys = ref.read(binderSelectionProvider);
    return ownedInBinder(ref.read(binderProvider), openId)
        .where((e) => keys.contains(binderRowKey(e)))
        .toList();
  }

  static String _cards(int n) => '$n ${n == 1 ? 'card' : 'cards'}';

  void _toast(BuildContext context, String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _moveSelected(BuildContext context) async {
    final openId = ref.read(openBinderIdProvider);
    final rows = _selectedRows();
    if (openId == null || rows.isEmpty) return;
    final dests = Binder.gridOrder(ref.read(bindersProvider))
        .where((b) => b.isLive && b.clientId != openId)
        .toList();
    final dest = await showModalBottomSheet<Binder>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (ctx) => SafeArea(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(title: Text('Move ${_cards(rows.length)} to…')),
              for (final binder in dests)
                ListTile(
                  key: Key('bulkMoveDest-${binder.clientId}'),
                  leading: const Icon(Icons.collections_bookmark_outlined),
                  title: Text(binder.name),
                  onTap: () => Navigator.pop(ctx, binder),
                ),
            ],
          ),
        ),
      ),
    );
    if (dest == null || !context.mounted) return;
    final moved =
        ref.read(binderProvider.notifier).moveEntries(rows, dest.clientId);
    ref.read(binderSelectionProvider.notifier).clear();
    _toast(
      context,
      moved == rows.length
          ? 'Moved ${_cards(moved)} to ${dest.name}'
          : 'Moved $moved of ${_cards(rows.length)} to ${dest.name}',
    );
  }

  /// Puts one copy of each selected card on my side of the trade. The cards
  /// stay in the Binder until the trade is confirmed.
  void _tradeSelected(BuildContext context) {
    final rows = _selectedRows();
    if (rows.isEmpty) return;
    final trade = ref.read(tradeDraftProvider.notifier);
    for (final row in rows) {
      trade.addCard(TradeSide.have, row.card);
    }
    ref.read(binderSelectionProvider.notifier).clear();
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(
        key: const Key('binderBulkTradeSnack'),
        content: Text('Added ${_cards(rows.length)} to your side of the trade'),
        action: SnackBarAction(
          label: 'View',
          onPressed: () =>
              ref.read(shellTabProvider.notifier).go(tradeTabIndex),
        ),
      ));
  }

  void _removeSelected(BuildContext context) {
    final rows = _selectedRows();
    if (rows.isEmpty) return;
    final notifier = ref.read(binderProvider.notifier);
    final removed = notifier.removeEntries(rows);
    ref.read(binderSelectionProvider.notifier).clear();
    if (removed.isEmpty) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(
        key: const Key('binderBulkRemovedSnack'),
        content: Text('Removed ${_cards(removed.length)}'),
        action: SnackBarAction(
          key: const Key('binderBulkRemovedUndo'),
          label: 'Undo',
          onPressed: () => notifier.restore(removed),
        ),
      ));
  }

  int _count(List<BinderEntry> e) => e.fold<int>(0, (s, x) => s + x.quantity);

  static String _appBarTitle({
    required bool onBinderTab,
    required String? openId,
    required List<Binder> binders,
  }) {
    if (!onBinderTab) return 'Want List';
    if (openId == null) return 'My Binders';
    for (final binder in binders) {
      if (binder.clientId == openId && binder.isLive) return binder.name;
    }
    return 'Binder';
  }

  Future<void> _createBinder(BuildContext context) async {
    final isPro = ref.read(isProProvider);
    if (!FreeLimits.canCreateBinder(
        ref.read(bindersProvider.notifier).live.length,
        isPro: isPro)) {
      await presentProPaywall(context, ref);
      if (!context.mounted) return;
      if (!ref.read(isProProvider)) return;
    }
    final name = await _promptName(context, title: 'New Binder');
    if (name == null || !context.mounted) return;
    final result = ref
        .read(bindersProvider.notifier)
        .create(name, isPro: ref.read(isProProvider));
    if (!result.ok && context.mounted) {
      if (result.reason == 'paywall') {
        await presentProPaywall(context, ref);
        if (!context.mounted) return;
        if (ref.read(isProProvider)) {
          final retry = ref
              .read(bindersProvider.notifier)
              .create(name, isPro: true);
          if (!retry.ok && context.mounted) _showNameError(context, retry);
        }
      } else {
        _showNameError(context, result);
      }
    }
  }

  Future<void> _renameBinder(BuildContext context, String clientId) async {
    final current = ref.read(bindersProvider.notifier).byId(clientId);
    final name = await _promptName(
      context,
      title: 'Rename Binder',
      initial: current?.name ?? '',
    );
    if (name == null || !context.mounted) return;
    final result = ref.read(bindersProvider.notifier).rename(clientId, name);
    if (!result.ok && context.mounted) _showNameError(context, result);
  }

  Future<void> _deleteBinder(BuildContext context, String clientId) async {
    final binder = ref.read(bindersProvider.notifier).byId(clientId);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Binder?'),
        content: Text(
          'Delete ${binder?.name ?? 'this Binder'}? This cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    final err = ref.read(bindersProvider.notifier).delete(clientId);
    if (err == null || !context.mounted) return;
    final message = switch (err) {
      'trade' => 'Trade Binder cannot be deleted',
      'not-empty' => 'Move or remove cards before deleting this Binder',
      _ => 'Could not delete Binder',
    };
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  void _showNameError(BuildContext context, BinderNameResult result) {
    final message = switch (result.reason) {
      'duplicate' => 'A Binder with that name already exists',
      'empty' => 'Name cannot be empty',
      _ => 'Could not save name',
    };
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<String?> _promptName(
    BuildContext context, {
    required String title,
    String initial = '',
  }) async {
    final controller = TextEditingController(text: initial);
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: TextField(
          key: const Key('binderNameField'),
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'Binder name'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text),
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Future<void> _showBinderAddOptions(BuildContext context) async {
    if (ref.read(openBinderIdProvider) == null) {
      // On the grid nothing is open, so ask where the cards should go rather
      // than silently filing them in the Trade Binder.
      final target = await _pickTargetBinder(context);
      if (target == null || !context.mounted) return;
      ref.read(binderFiltersProvider.notifier).clear();
      ref.read(openBinderIdProvider.notifier).open(target);
    }
    if (!context.mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.qr_code_scanner),
              title: const Text('Scan cards'),
              subtitle: const Text('Add each match and keep scanning'),
              onTap: () {
                Navigator.pop(ctx);
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (context.mounted) {
                    ScanScreen.forBinder(
                      context,
                      binderId: ref.read(openBinderIdProvider) ??
                          BinderIds.trade,
                    );
                  }
                });
              },
            ),
            ListTile(
              leading: const Icon(Icons.search),
              title: const Text('Add by search'),
              onTap: () {
                Navigator.pop(ctx);
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (context.mounted) _addBySearch(isWanted: false);
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<String?> _pickTargetBinder(BuildContext context) {
    final binders = Binder.gridOrder(
      ref.read(bindersProvider).where((b) => b.isLive),
    );
    return showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (ctx) => SafeArea(
        child: SingleChildScrollView(
          child: Column(
            key: const Key('addTargetBinderSheet'),
            mainAxisSize: MainAxisSize.min,
            children: [
              const ListTile(title: Text('Add cards to…')),
              for (final binder in binders)
                ListTile(
                  key: Key('addTarget-${binder.clientId}'),
                  leading: const Icon(Icons.collections_bookmark_outlined),
                  title: Text(binder.name),
                  onTap: () => Navigator.pop(ctx, binder.clientId),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _addBySearch({required bool isWanted}) async {
    final destId = destinationBinderId(
      openId: ref.read(openBinderIdProvider),
      tab: ref.read(homeTabIndexProvider),
    );
    final destName =
        ref.read(bindersProvider.notifier).byId(destId)?.name ?? 'Binder';
    await CardPickerScreen.showMulti(
      context,
      title: isWanted ? 'Add to Want List' : 'Add to Binder',
      onPick: (card) => addToBinderOrUpsell(
        context,
        ref,
        card,
        isWanted: isWanted,
        binderId: isWanted ? null : destId,
        successMessage: isWanted
            ? 'Added ${card.name} to Want List'
            : 'Added ${card.name} to $destName',
      ),
    );
  }
}

class _BinderValueChip extends StatelessWidget {
  const _BinderValueChip({required this.total, required this.onTap});
  final String total;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    const color = AppTheme.positive;
    return Material(
      elevation: 6,
      shadowColor: Colors.black54,
      color: scheme.surfaceContainerHigh,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        key: const Key('binderValueChip'),
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Semantics(
          button: true,
          label: 'Binder value',
          child: SizedBox(
            height: 56,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Center(
                child: Text(
                  total,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: color,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Stands in for the Add card row while rows are selected.
class _SelectionActionBar extends StatelessWidget {
  const _SelectionActionBar({
    required this.canMove,
    required this.onMove,
    required this.onTrade,
    required this.onRemove,
  });

  final bool canMove;
  final VoidCallback onMove;
  final VoidCallback onTrade;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Container(
      key: const Key('binderSelectionBar'),
      width: MediaQuery.sizeOf(context).width - 32,
      padding: const EdgeInsets.all(AppSpacing.xs),
      decoration: BoxDecoration(
        color: t.surface,
        borderRadius: AppRadii.xlAll,
        border: Border.all(color: t.border),
        boxShadow: t.shadowLg,
      ),
      child: Row(
        children: [
          _SelectionAction(
            key: const Key('binderBulkMove'),
            icon: Icons.drive_file_move_outline,
            label: 'Move',
            color: t.text,
            onTap: canMove ? onMove : null,
          ),
          _SelectionAction(
            key: const Key('binderBulkTrade'),
            icon: Icons.swap_horiz_rounded,
            label: 'Add to trade',
            color: t.text,
            onTap: onTrade,
          ),
          _SelectionAction(
            key: const Key('binderBulkRemove'),
            icon: Icons.delete_outline_rounded,
            label: 'Remove',
            color: t.loss,
            onTap: onRemove,
          ),
        ],
      ),
    );
  }
}

class _SelectionAction extends StatelessWidget {
  const _SelectionAction({
    super.key,
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = onTap == null ? context.tokens.textFaint : color;
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadii.mdAll,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 22, color: c),
              const SizedBox(height: AppSpacing.xxs),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: c,
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
