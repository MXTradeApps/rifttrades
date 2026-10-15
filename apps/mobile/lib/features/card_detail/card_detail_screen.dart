import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../app/fallback_network_image.dart';
import '../../app/printing_picker.dart';
import '../../app/theme.dart';
import '../../app/widgets.dart';
import '../../core/data/card_repository.dart';
import '../../core/models/app_settings.dart';
import '../../core/models/card_model.dart';
import '../../core/providers.dart';
import '../paywall/pro_limits.dart';
import 'price_history_section.dart';

class CardDetailScreen extends ConsumerStatefulWidget {
  const CardDetailScreen({super.key, required this.card});
  final CardModel card;

  @override
  ConsumerState<CardDetailScreen> createState() => _CardDetailScreenState();
}

class _CardDetailScreenState extends ConsumerState<CardDetailScreen> {
  late CardModel _selected = widget.card;

  void _select(CardModel c) {
    setState(() => _selected = c);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final settings = ref.watch(settingsProvider);
    final pricing = ref.watch(pricingProvider);
    final destId = destinationBinderId(
      openId: ref.watch(openBinderIdProvider),
      tab: ref.watch(homeTabIndexProvider),
    );
    final destRows = ref.watch(binderProvider.select((entries) => entries
        .where((e) =>
            e.card.id == _selected.id &&
            !e.isWanted &&
            e.resolvedBinderId == destId)
        .toList(growable: false)));
    final editCondition =
        destRows.length == 1 ? destRows.single.condition : 'NM';
    final owned = destRows
        .where((e) => e.condition == editCondition)
        .fold<int>(0, (s, e) => s + e.quantity);
    final wanted = ref.watch(binderProvider.select((entries) => entries.any(
        (e) => e.card.id == _selected.id && e.isWanted && e.quantity > 0)));
    final catalog = ref.watch(catalogProvider).maybeWhen(
          data: (cards) => cards,
          orElse: () => const <CardModel>[],
        );
    final printings = printingsForCard(catalog, widget.card);

    return Scaffold(
      appBar: AppBar(title: Text(_selected.name)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GestureDetector(
                onTap: () => _showCardImageViewer(context, _selected),
                child: Hero(
                  tag: 'card_${_selected.id}',
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: FallbackNetworkImage(
                      imageUrl: _selected.imageUrl ?? '',
                      height: 176,
                      width: 126,
                      fit: BoxFit.cover,
                      placeholder: (_, _) => const SizedBox(
                        height: 176,
                        width: 126,
                        child: Center(
                            child: CircularProgressIndicator.adaptive()),
                      ),
                      errorWidget: (_, _, _) => Container(
                        height: 176,
                        width: 126,
                        color: theme.colorScheme.surfaceContainerHighest,
                        child:
                            const Icon(Icons.broken_image_outlined, size: 40),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_selected.name,
                        style: theme.textTheme.titleLarge
                            ?.copyWith(fontWeight: FontWeight.w800)),
                    const SizedBox(height: 6),
                    CardMetaLine(
                        card: _selected, style: theme.textTheme.bodyMedium),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        RarityBadge(rarity: _selected.rarity),
                        if (_selected.isFoil)
                          const PillBadge(
                              label: 'FOIL',
                              color: Color(0xFF9B5DE5),
                              icon: Icons.auto_awesome),
                        if (owned > 0)
                          GestureDetector(
                            onTap: () => _editBinderQty(
                                context, owned, destId, editCondition),
                            child: PillBadge(
                                label: 'Own $owned',
                                color: context.tokens.gain,
                                icon: Icons.check),
                          ),
                        if (wanted)
                          PillBadge(
                              label: 'Wanted',
                              color: context.tokens.accent,
                              icon: Icons.favorite),
                      ],
                    ),
                    if (printings.length >= 2) ...[
                      const SizedBox(height: 12),
                      _PrintingSelector(
                        printings: printings,
                        selected: _selected,
                        onSelect: _select,
                        priceLabel: pricing.priceLabel,
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _PriceCard(card: _selected, settings: settings, pricing: pricing),
          const SizedBox(height: 14),
          PriceHistorySection(cardId: _selected.id),
        ],
      ),
      bottomNavigationBar: _ActionBar(card: _selected),
    );
  }

  Future<void> _editBinderQty(
    BuildContext context,
    int current,
    String binderId,
    String condition,
  ) async {
    var qty = current;
    final saved = await showDialog<int>(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return AlertDialog(
              title: const Text('Binder quantity'),
              content: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    onPressed: qty > 0
                        ? () => setDialogState(() => qty--)
                        : null,
                    icon: const Icon(Icons.remove_circle_outline),
                  ),
                  Text('$qty',
                      style: Theme.of(ctx).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w800)),
                  IconButton(
                    onPressed: () => setDialogState(() => qty++),
                    icon: const Icon(Icons.add_circle_outline),
                  ),
                ],
              ),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('Cancel')),
                FilledButton(
                    onPressed: () => Navigator.pop(ctx, qty),
                    child: const Text('Save')),
              ],
            );
          },
        );
      },
    );
    if (saved == null || !mounted) return;
    ref.read(binderProvider.notifier).setQuantity(
          _selected.id,
          false,
          saved,
          binderId: binderId,
          condition: condition,
        );
  }
}

void _showCardImageViewer(BuildContext context, CardModel card) {
  final url = card.imageUrl;
  if (url == null || url.isEmpty) return;
  showDialog<void>(
    context: context,
    barrierColor: Colors.black.withValues(alpha: 0.92),
    builder: (ctx) {
      return GestureDetector(
        onTap: () => Navigator.of(ctx).pop(),
        child: Scaffold(
          backgroundColor: Colors.transparent,
          body: SafeArea(
            child: Stack(
              children: [
                Center(
                  child: InteractiveViewer(
                    minScale: 1,
                    maxScale: 4,
                    child: FallbackNetworkImage(
                      imageUrl: url,
                      fit: BoxFit.contain,
                      placeholder: (_, _) => const SizedBox(
                        width: 48,
                        height: 48,
                        child: CircularProgressIndicator.adaptive(),
                      ),
                      errorWidget: (_, _, _) => const Icon(
                        Icons.broken_image_outlined,
                        color: Colors.white70,
                        size: 64,
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: 4,
                  right: 4,
                  child: IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () => Navigator.of(ctx).pop(),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    },
  );
}

class _PrintingSelector extends StatelessWidget {
  const _PrintingSelector({
    required this.printings,
    required this.selected,
    required this.onSelect,
    required this.priceLabel,
  });
  final List<CardModel> printings;
  final CardModel selected;
  final ValueChanged<CardModel> onSelect;
  final String Function(CardModel) priceLabel;

  @override
  Widget build(BuildContext context) {
    if (printings.length < 2) return const SizedBox.shrink();
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Versions',
            style: theme.textTheme.titleSmall
                ?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 6),
        ListTile(
          contentPadding: EdgeInsets.zero,
          dense: true,
          leading: selected.isFoil
              ? const Icon(Icons.auto_awesome, color: Color(0xFF9B5DE5))
              : Icon(Icons.style_outlined,
                  color: theme.colorScheme.onSurfaceVariant),
          title: Text(printingLabel(selected)),
          subtitle: Text(
            '${printings.length} versions · tap to change',
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          trailing: Icon(Icons.unfold_more,
              color: theme.colorScheme.onSurfaceVariant),
          onTap: () async {
            final picked = await showPrintingPicker(
              context: context,
              current: selected,
              printings: printings,
              priceLabel: priceLabel,
            );
            if (picked != null) onSelect(picked);
          },
        ),
      ],
    );
  }
}

class _PriceCard extends StatelessWidget {
  const _PriceCard({
    required this.card,
    required this.settings,
    required this.pricing,
  });
  final CardModel card;
  final AppSettings settings;
  final dynamic pricing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final usd = NumberFormat.currency(locale: 'en_US', symbol: '\$');
    final eur = NumberFormat.currency(locale: 'en_US', symbol: '€');
    String f(NumberFormat nf, double? v) => v == null ? '—' : nf.format(v);

    final tcgRows = <MapEntry<String, String>>[
      MapEntry('Market', f(usd, card.tcgMarket)),
      MapEntry('Low', f(usd, card.tcgLow)),
      MapEntry('Mid', f(usd, card.tcgMid)),
      MapEntry('High', f(usd, card.tcgHigh)),
      MapEntry('Direct low', f(usd, card.tcgDirectLow)),
    ];
    final cmRows = <MapEntry<String, String>>[
      MapEntry('Trend', f(eur, card.isFoil ? card.cmTrendFoil : card.cmTrend)),
      MapEntry('Low', f(eur, card.isFoil ? card.cmLowFoil : card.cmLow)),
      MapEntry('Avg', f(eur, card.isFoil ? card.cmAvgFoil : card.cmAvg)),
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.sell_outlined,
                    size: 18, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text('Prices',
                    style: theme.textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(width: 8),
                Text(settings.source.label,
                    style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant)),
                const Spacer(),
                PriceSourceBadge(source: settings.source.label),
              ],
            ),
            const SizedBox(height: 10),
            _PriceGroup(title: 'TCGplayer (USD)', rows: tcgRows),
            const SizedBox(height: 10),
            _PriceGroup(title: 'CardMarket (EUR)', rows: cmRows),
            const SizedBox(height: 10),
            _PriceAttribution(updatedAt: card.priceUpdatedAt),
          ],
        ),
      ),
    );
  }
}

/// Credits where the price data comes from and when it was last synced, so the
/// numbers are always traceable to their marketplace source.
class _PriceAttribution extends StatelessWidget {
  const _PriceAttribution({required this.updatedAt});
  final DateTime? updatedAt;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final style = theme.textTheme.bodySmall
        ?.copyWith(color: theme.colorScheme.onSurfaceVariant);
    final updated = updatedAt == null
        ? null
        : DateFormat('MMM d, yyyy').format(updatedAt!.toLocal());
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(Icons.storefront_outlined,
            size: 14, color: theme.colorScheme.onSurfaceVariant),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            'Price data from TCGplayer & CardMarket'
            '${updated == null ? '' : ' · updated $updated'}',
            style: style,
          ),
        ),
      ],
    );
  }
}

class _PriceGroup extends StatelessWidget {
  const _PriceGroup({required this.title, required this.rows});
  final String title;
  final List<MapEntry<String, String>> rows;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title,
            style: theme.textTheme.labelMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: theme.colorScheme.onSurfaceVariant)),
        const SizedBox(height: 6),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final r in rows)
                Padding(
                  padding: const EdgeInsets.only(right: 18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(r.key,
                          style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant)),
                      const SizedBox(height: 2),
                      Text(r.value,
                          style: theme.textTheme.titleMedium
                              ?.copyWith(fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ActionBar extends ConsumerWidget {
  const _ActionBar({required this.card});
  final CardModel card;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: FilledButton.tonalIcon(
          style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
              backgroundColor: context.tokens.accent.withValues(alpha: 0.15),
              foregroundColor: context.tokens.accent),
          icon: const Icon(Icons.favorite_border),
          label: const Text('Want'),
          onPressed: () => addToBinderOrUpsell(
            context,
            ref,
            card,
            isWanted: true,
            successMessage: 'Added to Want List',
          ),
        ),
      ),
    );
  }
}
