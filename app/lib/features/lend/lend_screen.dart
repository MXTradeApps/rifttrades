import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/app.dart';
import '../../app/theme.dart';
import '../../app/widgets.dart';
import '../../core/logic/pricing.dart';
import '../../core/models/lend_entry.dart';
import '../../core/providers.dart';
import '../card_detail/card_detail_screen.dart';
import '../search/card_picker.dart';

class LendScreen extends ConsumerStatefulWidget {
  const LendScreen({super.key});

  @override
  ConsumerState<LendScreen> createState() => _LendScreenState();
}

class _LendScreenState extends ConsumerState<LendScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab = TabController(length: 2, vsync: this)
    ..addListener(() => setState(() {}));

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final entries = ref.watch(lendProvider);
    final pricing = ref.watch(pricingProvider);
    final lentOut = entries.where((e) => !e.isBorrowing).toList();
    final borrowing = entries.where((e) => e.isBorrowing).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Lend'),
        actions: const [SettingsAction()],
        bottom: TabBar(
          controller: _tab,
          tabs: [
            Tab(text: 'Lent out (${_count(lentOut)})'),
            Tab(text: 'Borrowing (${_count(borrowing)})'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tab,
        children: [
          _LendList(
            entries: lentOut,
            pricing: pricing,
            isBorrowing: false,
            emptyText: "You haven't lent out any cards yet.",
          ),
          _LendList(
            entries: borrowing,
            pricing: pricing,
            isBorrowing: true,
            emptyText: "You aren't borrowing any cards yet.",
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'lendFab',
        onPressed: () => _add(context),
        icon: const Icon(Icons.add),
        label: Text(_tab.index == 0 ? 'Lend a card' : 'Borrow a card'),
      ),
    );
  }

  int _count(List<LendEntry> e) => e.fold<int>(0, (s, x) => s + x.quantity);

  Future<void> _add(BuildContext context) async {
    final isBorrowing = _tab.index == 1;
    final card = await CardPickerScreen.show(context,
        title: isBorrowing ? 'Borrow a card' : 'Lend a card');
    if (card == null || !context.mounted) return;
    final personName = await _askPersonName(context, isBorrowing: isBorrowing);
    // A null result means the dialog was dismissed — cancel the add.
    if (personName == null) return;
    ref.read(lendProvider.notifier).add(
          card,
          personName: personName.isEmpty ? null : personName,
          isBorrowing: isBorrowing,
        );
  }
}

/// Prompts for an optional person name. Returns the entered string (possibly
/// empty for "no name"), or null if the dialog was cancelled/dismissed.
Future<String?> _askPersonName(
  BuildContext context, {
  required bool isBorrowing,
  String? initial,
}) {
  final controller = TextEditingController(text: initial ?? '');
  return showDialog<String>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(isBorrowing ? 'Borrowing from' : 'Lent to'),
      content: TextField(
        controller: controller,
        autofocus: true,
        textCapitalization: TextCapitalization.words,
        decoration: const InputDecoration(
          labelText: 'Name (optional)',
          hintText: 'e.g. Alex',
        ),
        onSubmitted: (v) => Navigator.of(context).pop(v.trim()),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(controller.text.trim()),
          child: const Text('Save'),
        ),
      ],
    ),
  );
}

class _LendList extends ConsumerWidget {
  const _LendList({
    required this.entries,
    required this.pricing,
    required this.isBorrowing,
    required this.emptyText,
  });

  final List<LendEntry> entries;
  final Pricing pricing;
  final bool isBorrowing;
  final String emptyText;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (entries.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Text(
            emptyText,
            textAlign: TextAlign.center,
            style:
                TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
          ),
        ),
      );
    }
    final total = entries.fold<double>(
        0, (s, e) => s + (pricing.value(e.card) ?? 0) * e.quantity);

    return Column(
      children: [
        _TotalHeader(
          count: entries.fold<int>(0, (s, e) => s + e.quantity),
          people: entries.map((e) => e.personName).whereType<String>().toSet(),
          total: pricing.formatValue(total),
          isBorrowing: isBorrowing,
        ),
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.only(bottom: 96),
            itemCount: entries.length,
            separatorBuilder: (_, _) => const Divider(height: 1, indent: 72),
            itemBuilder: (context, i) =>
                _LendRow(entry: entries[i], pricing: pricing),
          ),
        ),
      ],
    );
  }
}

class _TotalHeader extends StatelessWidget {
  const _TotalHeader({
    required this.count,
    required this.people,
    required this.total,
    required this.isBorrowing,
  });
  final int count;
  final Set<String> people;
  final String total;
  final bool isBorrowing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = isBorrowing ? AppTheme.wantAccent : AppTheme.positive;
    final peopleLabel = people.isEmpty
        ? null
        : '${people.length} ${people.length == 1 ? 'person' : 'people'}';
    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Icon(isBorrowing ? Icons.call_received : Icons.call_made,
              color: color),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(isBorrowing ? 'Borrowed value' : 'Lent out value',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
              Text(
                  peopleLabel == null
                      ? '$count cards'
                      : '$count cards  •  $peopleLabel',
                  style: theme.textTheme.bodyMedium),
            ],
          ),
          const Spacer(),
          Text(total,
              style: theme.textTheme.headlineSmall
                  ?.copyWith(fontWeight: FontWeight.w800, color: color)),
        ],
      ),
    );
  }
}

class _LendRow extends ConsumerWidget {
  const _LendRow({required this.entry, required this.pricing});
  final LendEntry entry;
  final Pricing pricing;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final notifier = ref.read(lendProvider.notifier);
    final card = entry.card;
    final lineValue = (pricing.value(card) ?? 0) * entry.quantity;

    return Dismissible(
      key: ValueKey(entry.id),
      direction: DismissDirection.endToStart,
      background: Container(
        color: AppTheme.negative,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: (_) => notifier.remove(entry.id),
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
                    Row(
                      children: [
                        RarityBadge(rarity: card.rarity),
                        if (card.isFoil) ...[
                          const SizedBox(width: 5),
                          const PillBadge(
                              label: 'FOIL',
                              color: Color(0xFF9B5DE5),
                              icon: Icons.auto_awesome),
                        ],
                        const SizedBox(width: 5),
                        _PersonChip(
                          personName: entry.personName,
                          isBorrowing: entry.isBorrowing,
                          onTap: () => _editPerson(context, notifier),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(pricing.formatValue(lineValue),
                      style: theme.textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  _MiniStepper(
                    qty: entry.quantity,
                    onInc: () =>
                        notifier.setQuantity(entry.id, entry.quantity + 1),
                    onDec: () =>
                        notifier.setQuantity(entry.id, entry.quantity - 1),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _editPerson(BuildContext context, LendNotifier notifier) async {
    final name = await _askPersonName(context,
        isBorrowing: entry.isBorrowing, initial: entry.personName);
    if (name == null) return;
    notifier.setPersonName(entry.id, name.isEmpty ? null : name);
  }
}

class _PersonChip extends StatelessWidget {
  const _PersonChip({
    required this.personName,
    required this.isBorrowing,
    required this.onTap,
  });
  final String? personName;
  final bool isBorrowing;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final hasName = personName != null && personName!.isNotEmpty;
    final label = hasName ? personName! : 'Add name';
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: scheme.secondaryContainer,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.person_outline,
                size: 12, color: scheme.onSecondaryContainer),
            const SizedBox(width: 3),
            Text(label,
                style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    fontStyle: hasName ? FontStyle.normal : FontStyle.italic,
                    color: scheme.onSecondaryContainer)),
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
