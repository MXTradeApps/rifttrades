import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../app/fallback_network_image.dart';
import '../../app/printing_picker.dart';
import '../../app/theme.dart';
import '../../app/ui.dart';
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
    final destRows = ref.watch(
      binderProvider.select(
        (entries) => entries
            .where(
              (e) =>
                  e.card.id == _selected.id &&
                  !e.isWanted &&
                  e.resolvedBinderId == destId,
            )
            .toList(growable: false),
      ),
    );
    final editCondition = destRows.length == 1
        ? destRows.single.condition
        : 'NM';
    final owned = destRows
        .where((e) => e.condition == editCondition)
        .fold<int>(0, (s, e) => s + e.quantity);
    final wanted = ref.watch(
      binderProvider.select(
        (entries) => entries.any(
          (e) => e.card.id == _selected.id && e.isWanted && e.quantity > 0,
        ),
      ),
    );
    final catalog = ref
        .watch(catalogProvider)
        .maybeWhen(data: (cards) => cards, orElse: () => const <CardModel>[]);
    final printings = printingsForCard(catalog, widget.card);

    return Scaffold(
      appBar: AppBar(),
      // Not lazily built: the page is short, and building it all keeps the
      // price history mounted however small the screen.
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                GestureDetector(
                  onTap: () => _showCardImageViewer(context, _selected),
                  child: Hero(
                    tag: 'card_${_selected.id}',
                    child: ClipRRect(
                      borderRadius: AppRadii.lgAll,
                      child: FallbackNetworkImage(
                        imageUrl: _selected.imageUrl ?? '',
                        height: 196,
                        width: 140,
                        fit: BoxFit.cover,
                        placeholder: (_, _) => Container(
                          height: 196,
                          width: 140,
                          color: context.tokens.sunken,
                        ),
                        errorWidget: (_, _, _) => Container(
                          height: 196,
                          width: 140,
                          color: theme.colorScheme.surfaceContainerHighest,
                          child: const Icon(
                            Icons.broken_image_outlined,
                            size: 40,
                          ),
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
                      Text(
                        _selected.name,
                        style: theme.textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 6),
                      CardMetaLine(
                        card: _selected,
                        style: theme.textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          RarityBadge(rarity: _selected.rarity),
                          if (_selected.isFoil)
                            FoilTag(
                              subTypeName: _selected.subTypeName,
                              label: _selected.finishLabel,
                            ),
                          if (owned > 0)
                            GestureDetector(
                              onTap: () => _editBinderQty(
                                context,
                                owned,
                                destId,
                                editCondition,
                              ),
                              child: PillBadge(
                                label: 'Own $owned',
                                color: context.tokens.gain,
                                icon: Icons.check,
                              ),
                            ),
                          if (wanted)
                            PillBadge(
                              label: 'Wanted',
                              color: context.tokens.accent,
                              icon: Icons.favorite,
                            ),
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
            const SizedBox(height: 20),
            _PriceCard(card: _selected, settings: settings, pricing: pricing),
            const SizedBox(height: 14),
            PriceHistorySection(cardId: _selected.id),
          ],
        ),
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
                  Text(
                    '$qty',
                    style: Theme.of(ctx).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  IconButton(
                    onPressed: () => setDialogState(() => qty++),
                    icon: const Icon(Icons.add_circle_outline),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: () => Navigator.pop(ctx, qty),
                  child: const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );
    if (saved == null || !mounted) return;
    ref
        .read(binderProvider.notifier)
        .setQuantity(
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
        Text(
          'Versions',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 6),
        ListTile(
          contentPadding: EdgeInsets.zero,
          dense: true,
          leading: selected.isFoil
              ? const Icon(Icons.auto_awesome, color: Color(0xFF9B5DE5))
              : Icon(
                  Icons.style_outlined,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
          title: Text(printingLabel(selected)),
          subtitle: Text(
            '${printings.length} versions · tap to change',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          trailing: Icon(
            Icons.unfold_more,
            color: theme.colorScheme.onSurfaceVariant,
          ),
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
    final usd = NumberFormat.currency(locale: 'en_US', symbol: '\$');
    final eur = NumberFormat.currency(locale: 'en_US', symbol: '€');
    String f(NumberFormat nf, double? v) => v == null ? '—' : nf.format(v);
    final activeTcg = settings.source == PriceSource.tcgplayer;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionTitle(
          'Prices',
          icon: Icons.sell_outlined,
          padding: const EdgeInsets.only(bottom: 10),
          trailing: PriceSourceBadge(source: settings.source.label),
        ),
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: _MarketBox(
                  title: 'TCGplayer',
                  active: activeTcg,
                  headlineLabel: 'Market',
                  headline: f(usd, card.tcgMarket),
                  rows: [
                    MapEntry('Low', f(usd, card.tcgLow)),
                    MapEntry('Mid', f(usd, card.tcgMid)),
                    MapEntry('High', f(usd, card.tcgHigh)),
                    MapEntry('Direct low', f(usd, card.tcgDirectLow)),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MarketBox(
                  title: 'CardMarket',
                  active: !activeTcg,
                  headlineLabel: 'Trend',
                  headline: f(
                    eur,
                    card.isFoil ? card.cmTrendFoil : card.cmTrend,
                  ),
                  rows: [
                    MapEntry(
                      'Low',
                      f(eur, card.isFoil ? card.cmLowFoil : card.cmLow),
                    ),
                    MapEntry(
                      'Avg',
                      f(eur, card.isFoil ? card.cmAvgFoil : card.cmAvg),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        _PriceAttribution(updatedAt: card.priceUpdatedAt),
      ],
    );
  }
}

/// One marketplace's prices: a headline figure over a small label/value list,
/// like the per-marketplace price boxes in the web card detail modal. The
/// marketplace the app prices trades with is outlined in the accent.
class _MarketBox extends StatelessWidget {
  const _MarketBox({
    required this.title,
    required this.active,
    required this.headlineLabel,
    required this.headline,
    required this.rows,
  });

  final String title;
  final bool active;
  final String headlineLabel;
  final String headline;
  final List<MapEntry<String, String>> rows;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = context.tokens;
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
      decoration: BoxDecoration(
        color: t.surface,
        borderRadius: AppRadii.xlAll,
        border: Border.all(
          color: active ? t.accent.withValues(alpha: 0.55) : t.border,
          width: active ? 1.2 : 1,
        ),
        boxShadow: t.shadowSm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.labelMedium?.copyWith(color: t.textMuted),
          ),
          const SizedBox(height: 8),
          Text(
            headlineLabel,
            style: theme.textTheme.bodySmall?.copyWith(color: t.textFaint),
          ),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              headline,
              style: AppType.tabular(theme.textTheme.headlineSmall),
            ),
          ),
          const SizedBox(height: 8),
          for (final r in rows)
            Padding(
              padding: const EdgeInsets.only(top: 3),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      r.key,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: t.textMuted,
                      ),
                    ),
                  ),
                  Text(
                    r.value,
                    style: AppType.tabular(
                      theme.textTheme.bodySmall?.copyWith(
                        color: t.text,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
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
    final style = theme.textTheme.bodySmall?.copyWith(
      color: theme.colorScheme.onSurfaceVariant,
    );
    final updated = updatedAt == null
        ? null
        : DateFormat('MMM d, yyyy').format(updatedAt!.toLocal());
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          Icons.storefront_outlined,
          size: 14,
          color: theme.colorScheme.onSurfaceVariant,
        ),
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

class _ActionBar extends ConsumerWidget {
  const _ActionBar({required this.card});
  final CardModel card;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.tokens;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: t.surface,
        border: Border(top: BorderSide(color: t.border)),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
          child: OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
            ),
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
      ),
    );
  }
}
