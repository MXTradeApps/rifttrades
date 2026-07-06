import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/app.dart';
import '../../app/theme.dart';
import '../../app/widgets.dart';
import '../../core/models/trade.dart';
import '../../core/providers.dart';
import '../search/card_picker.dart';
import 'trade_history_screen.dart';

class TradeScreen extends ConsumerWidget {
  const TradeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trade = ref.watch(tradeDraftProvider);
    final notifier = ref.read(tradeDraftProvider.notifier);
    final isEmpty = trade.haveItems.isEmpty &&
        trade.wantItems.isEmpty &&
        trade.haveCash == 0 &&
        trade.wantCash == 0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Trade'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            tooltip: 'Trade history',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const TradeHistoryScreen()),
            ),
          ),
          if (!isEmpty)
            IconButton(
              icon: const Icon(Icons.delete_sweep_outlined),
              tooltip: 'Clear trade',
              onPressed: () => _confirmClear(context, notifier),
            ),
          const SettingsAction(),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: isEmpty
                ? const _EmptyTrade()
                : ListView(
                    padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
                    children: [
                      _SidePanel(
                        side: TradeSide.have,
                        title: 'You give',
                        accent: AppTheme.haveAccent,
                        items: trade.haveItems,
                        cash: trade.haveCash,
                        total: trade.haveTotal,
                        symbol: trade.currencySymbol,
                      ),
                      const SizedBox(height: 12),
                      _SidePanel(
                        side: TradeSide.want,
                        title: 'You receive',
                        accent: AppTheme.wantAccent,
                        items: trade.wantItems,
                        cash: trade.wantCash,
                        total: trade.wantTotal,
                        symbol: trade.currencySymbol,
                      ),
                    ],
                  ),
          ),
          isEmpty ? const _AddBar() : _BalanceBar(trade: trade),
        ],
      ),
    );
  }

  void _confirmClear(BuildContext context, TradeDraftNotifier notifier) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Clear trade?'),
        content: const Text('This removes all cards and cash from the draft.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              notifier.clear();
              Navigator.pop(ctx);
            },
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }
}

class _EmptyTrade extends ConsumerWidget {
  const _EmptyTrade();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.swap_horiz, size: 64, color: scheme.primary),
            const SizedBox(height: 16),
            Text('Build a trade',
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(
              'Add cards to each side and RiftTrades keeps the values balanced in real time.',
              textAlign: TextAlign.center,
              style: TextStyle(color: scheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}

class _AddBar extends ConsumerWidget {
  const _AddBar();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                icon: const Icon(Icons.add),
                label: const Text('Add to Give'),
                onPressed: () => _pick(context, ref, TradeSide.have),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: FilledButton.icon(
                icon: const Icon(Icons.add),
                label: const Text('Add to Receive'),
                onPressed: () => _pick(context, ref, TradeSide.want),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

Future<void> _pick(BuildContext context, WidgetRef ref, TradeSide side) async {
  final card = await CardPickerScreen.show(context,
      title: side == TradeSide.have ? 'Add to Give' : 'Add to Receive');
  if (card != null) {
    ref.read(tradeDraftProvider.notifier).addCard(side, card);
  }
}

class _SidePanel extends ConsumerWidget {
  const _SidePanel({
    required this.side,
    required this.title,
    required this.accent,
    required this.items,
    required this.cash,
    required this.total,
    required this.symbol,
  });

  final TradeSide side;
  final String title;
  final Color accent;
  final List<TradeItem> items;
  final double cash;
  final double total;
  final String symbol;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final notifier = ref.read(tradeDraftProvider.notifier);
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 8,
                  height: 20,
                  decoration: BoxDecoration(
                      color: accent,
                      borderRadius: BorderRadius.circular(4)),
                ),
                const SizedBox(width: 8),
                Text(title,
                    style: theme.textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.w800)),
                const Spacer(),
                Text(
                  '$symbol${total.toStringAsFixed(2)}',
                  style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800, color: accent),
                ),
              ],
            ),
            const SizedBox(height: 4),
            if (items.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text('No cards yet.',
                    style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant)),
              )
            else
              for (final item in items)
                _TradeItemRow(
                  item: item,
                  symbol: symbol,
                  onInc: () => notifier.setQuantity(
                      side, item.card.id, item.quantity + 1),
                  onDec: () => notifier.setQuantity(
                      side, item.card.id, item.quantity - 1),
                  onRemove: () => notifier.removeCard(side, item.card.id),
                ),
            const Divider(height: 16),
            Row(
              children: [
                Icon(Icons.payments_outlined,
                    size: 18, color: theme.colorScheme.onSurfaceVariant),
                const SizedBox(width: 8),
                const Text('Cash'),
                const Spacer(),
                SizedBox(
                  width: 110,
                  child: _CashField(
                    initial: cash,
                    symbol: symbol,
                    onChanged: (v) => notifier.setCash(side, v),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Add card'),
                onPressed: () => _pick(context, ref, side),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TradeItemRow extends StatelessWidget {
  const _TradeItemRow({
    required this.item,
    required this.symbol,
    required this.onInc,
    required this.onDec,
    required this.onRemove,
  });
  final TradeItem item;
  final String symbol;
  final VoidCallback onInc;
  final VoidCallback onDec;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          CardThumbnail(
              url: item.card.imageUrl,
              foil: item.card.isFoil,
              width: 36,
              height: 50),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.card.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 14)),
                Text(
                  '$symbol${item.priceEach.toStringAsFixed(2)} ea · $symbol${item.lineTotal.toStringAsFixed(2)}',
                  style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant),
                ),
              ],
            ),
          ),
          _QtyStepper(qty: item.quantity, onInc: onInc, onDec: onDec),
          IconButton(
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.close, size: 18),
            onPressed: onRemove,
          ),
        ],
      ),
    );
  }
}

class _QtyStepper extends StatelessWidget {
  const _QtyStepper(
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
          _stepBtn(Icons.remove, onDec),
          SizedBox(
            width: 22,
            child: Text('$qty',
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
          _stepBtn(Icons.add, onInc),
        ],
      ),
    );
  }

  Widget _stepBtn(IconData icon, VoidCallback onTap) => InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(padding: const EdgeInsets.all(6), child: Icon(icon, size: 16)),
      );
}

class _CashField extends StatefulWidget {
  const _CashField(
      {required this.initial, required this.symbol, required this.onChanged});
  final double initial;
  final String symbol;
  final ValueChanged<double> onChanged;

  @override
  State<_CashField> createState() => _CashFieldState();
}

class _CashFieldState extends State<_CashField> {
  late final TextEditingController _c = TextEditingController(
      text: widget.initial == 0 ? '' : widget.initial.toStringAsFixed(2));

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _c,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      textAlign: TextAlign.right,
      inputFormatters: [
        FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}')),
      ],
      decoration: InputDecoration(
        isDense: true,
        prefixText: widget.symbol,
        hintText: '0.00',
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      ),
      onChanged: (v) => widget.onChanged(double.tryParse(v) ?? 0),
    );
  }
}

class _BalanceBar extends ConsumerWidget {
  const _BalanceBar({required this.trade});
  final Trade trade;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final delta = trade.delta;
    final symbol = trade.currencySymbol;
    final balanced = delta.abs() < 0.01;
    final Color color = balanced
        ? AppTheme.positive
        : (delta > 0 ? AppTheme.negative : AppTheme.positive);

    final String label;
    if (balanced) {
      label = 'Even trade';
    } else if (delta > 0) {
      label = 'You give $symbol${delta.abs().toStringAsFixed(2)} more';
    } else {
      label = 'You gain $symbol${delta.abs().toStringAsFixed(2)} in value';
    }

    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          border: Border(
              top: BorderSide(color: theme.colorScheme.outlineVariant)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Icon(balanced ? Icons.balance : Icons.trending_up,
                        color: color, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(label,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                  color: color,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13)),
                          Text(
                            'Give $symbol${trade.haveTotal.toStringAsFixed(2)}  •  Get $symbol${trade.wantTotal.toStringAsFixed(2)}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.colorScheme.onSurfaceVariant),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 12),
            FilledButton.icon(
              icon: const Icon(Icons.save_outlined, size: 18),
              label: const Text('Save'),
              onPressed: () => _save(context, ref),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _save(BuildContext context, WidgetRef ref) async {
    final notesController = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Save trade'),
        content: TextField(
          controller: notesController,
          decoration: const InputDecoration(
            labelText: 'Notes (optional)',
            hintText: 'e.g. Traded with Alex at LGS',
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Save trade')),
        ],
      ),
    );
    if (confirmed != true) return;

    final saved = trade.copyWith(notes: notesController.text.trim());
    final finalTrade = Trade(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      createdAt: DateTime.now(),
      notes: saved.notes,
      haveItems: saved.haveItems,
      wantItems: saved.wantItems,
      haveCash: saved.haveCash,
      wantCash: saved.wantCash,
      currencySymbol: saved.currencySymbol,
    );
    ref.read(tradeHistoryProvider.notifier).addTrade(finalTrade);
    ref.read(tradeDraftProvider.notifier).clear();
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Trade saved to history')),
      );
    }
  }
}
