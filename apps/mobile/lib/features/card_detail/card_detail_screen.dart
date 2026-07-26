import 'package:cached_network_image/cached_network_image.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../app/theme.dart';
import '../../app/widgets.dart';
import '../../core/data/card_repository.dart';
import '../../core/models/app_settings.dart';
import '../../core/models/card_model.dart';
import '../../core/providers.dart';
import '../paywall/pro_limits.dart';

class CardDetailScreen extends ConsumerStatefulWidget {
  const CardDetailScreen({super.key, required this.card});
  final CardModel card;

  @override
  ConsumerState<CardDetailScreen> createState() => _CardDetailScreenState();
}

class _CardDetailScreenState extends ConsumerState<CardDetailScreen> {
  late CardModel _selected = widget.card;
  late Future<List<PricePoint>> _history;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  void _loadHistory() {
    _history = ref.read(cardRepositoryProvider).priceHistory(_selected.id);
  }

  void _select(CardModel c) {
    setState(() {
      _selected = c;
      _loadHistory();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final settings = ref.watch(settingsProvider);
    final pricing = ref.watch(pricingProvider);
    final owned = ref.watch(binderProvider.select((entries) => entries
        .where((e) => e.card.id == _selected.id && !e.isWanted)
        .fold<int>(0, (s, e) => s + e.quantity)));
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
                    child: CachedNetworkImage(
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
                            onTap: () => _editBinderQty(context, owned),
                            child: PillBadge(
                                label: 'Own $owned',
                                color: AppTheme.positive,
                                icon: Icons.check),
                          ),
                        if (wanted)
                          PillBadge(
                              label: 'Wanted',
                              color: AppTheme.wantAccent,
                              icon: Icons.favorite),
                      ],
                    ),
                    if (printings.length >= 2) ...[
                      const SizedBox(height: 12),
                      _PrintingSelector(
                        printings: printings,
                        selectedId: _selected.id,
                        onSelect: _select,
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
          _HistorySection(history: _history, settings: settings),
        ],
      ),
      bottomNavigationBar: _ActionBar(card: _selected),
    );
  }

  Future<void> _editBinderQty(BuildContext context, int current) async {
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
    ref
        .read(binderProvider.notifier)
        .setQuantity(_selected.id, false, saved);
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
                    child: CachedNetworkImage(
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
    required this.selectedId,
    required this.onSelect,
  });
  final List<CardModel> printings;
  final String selectedId;
  final ValueChanged<CardModel> onSelect;

  /// Short abbreviations for the verbose DB qualifier values.
  static const _shortQualifiers = <String, String>{
    'Alternate Art': 'Alt Art',
    'Overnumbered': 'Overnumber',
  };

  /// Concise label for a printing: just its art variant ("Alt Art",
  /// "Overnumber", "Signature") or "Foil"/"Normal" for the base card. The foil
  /// icon avatar already conveys the finish, so no collector number is shown.
  static String _label(CardModel c) {
    final qualifier = nameQualifier(c.name);
    if (qualifier != null) return _shortQualifiers[qualifier] ?? qualifier;
    return c.isFoil ? 'Foil' : 'Normal';
  }

  @override
  Widget build(BuildContext context) {
    if (printings.length < 2) return const SizedBox.shrink();
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text('Versions',
                style: theme.textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(width: 6),
            Text('(${printings.length})',
                style: theme.textTheme.bodySmall
                    ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
          ],
        ),
        const SizedBox(height: 6),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final c in printings)
              ChoiceChip(
                visualDensity: VisualDensity.compact,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                side: BorderSide(color: theme.colorScheme.outline),
                avatar: c.isFoil
                    ? const Icon(Icons.auto_awesome, size: 14)
                    : null,
                label: Text(_label(c)),
                selected: c.id == selectedId,
                onSelected: (_) => onSelect(c),
              ),
          ],
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

class _HistorySection extends StatelessWidget {
  const _HistorySection({required this.history, required this.settings});
  final Future<List<PricePoint>> history;
  final AppSettings settings;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return FutureBuilder<List<PricePoint>>(
      future: history,
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const SizedBox(
              height: 60,
              child: Center(child: CircularProgressIndicator.adaptive()));
        }
        final points = snap.data ?? const [];
        final values = points
            .map((p) => settings.source == PriceSource.tcgplayer
                ? p.tcgMarket
                : p.cmTrend)
            .toList();
        final hasSeries = values.where((v) => v != null).length >= 2;

        return Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.show_chart,
                        size: 18, color: theme.colorScheme.primary),
                    const SizedBox(width: 8),
                    Text('Price history',
                        style: theme.textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w700)),
                  ],
                ),
                if (hasSeries) ...[
                  const SizedBox(height: 4),
                  Text(
                    _historyRangeLabel(points),
                    style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant),
                  ),
                ],
                const SizedBox(height: 10),
                if (!hasSeries)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Center(
                      child: Text(
                        'Not enough history yet.\nDaily snapshots build the chart over time.',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant),
                      ),
                    ),
                  )
                else
                  SizedBox(
                    height: 140,
                    child: _Sparkline(
                      points: points,
                      values: values,
                      color: theme.colorScheme.primary,
                      symbol: settings.source.symbol,
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Human-readable span for the price history X-axis (e.g. "Last 3 months · Mar 4 – Jul 18").
String _historyRangeLabel(List<PricePoint> points) {
  if (points.isEmpty) return '';
  final start = points.first.capturedOn.toLocal();
  final end = points.last.capturedOn.toLocal();
  final days = end.difference(start).inDays;
  final fmt = DateFormat('MMM d');
  final span = days >= 150
      ? 'Last 6 months'
      : days >= 60
          ? 'Last 3 months'
          : days >= 25
              ? 'Last month'
              : 'Last $days days';
  if (days < 1) return span;
  return '$span · ${fmt.format(start)} – ${fmt.format(end)}';
}

class _Sparkline extends StatelessWidget {
  const _Sparkline({
    required this.points,
    required this.values,
    required this.color,
    required this.symbol,
  });
  final List<PricePoint> points;
  final List<double?> values;
  final Color color;
  final String symbol;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final spots = <FlSpot>[];
    final indexBySpotX = <double, int>{};
    for (var i = 0; i < values.length; i++) {
      final v = values[i];
      if (v != null) {
        final x = i.toDouble();
        spots.add(FlSpot(x, v));
        indexBySpotX[x] = i;
      }
    }
    if (spots.isEmpty) return const SizedBox.shrink();

    final firstX = spots.first.x;
    final lastX = spots.last.x;
    final midX = spots[spots.length ~/ 2].x;
    final labelXs = <double>{firstX, midX, lastX};

    String labelFor(double x) {
      final i = indexBySpotX[x];
      if (i == null || i < 0 || i >= points.length) return '';
      return DateFormat('MMM d').format(points[i].capturedOn.toLocal());
    }

    return LineChart(
      LineChartData(
        gridData: const FlGridData(show: false),
        titlesData: FlTitlesData(
          topTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 22,
              interval: 1,
              getTitlesWidget: (value, meta) {
                if (!labelXs.contains(value)) {
                  return const SizedBox.shrink();
                }
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    labelFor(value),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        borderData: FlBorderData(show: false),
        lineTouchData: LineTouchData(
          enabled: true,
          touchTooltipData: LineTouchTooltipData(
            getTooltipItems: (touched) => touched.map((s) {
              final i = indexBySpotX[s.x];
              final date = i == null
                  ? ''
                  : DateFormat('MMM d').format(
                      points[i].capturedOn.toLocal(),
                    );
              return LineTooltipItem(
                '$date\n$symbol${s.y.toStringAsFixed(2)}',
                TextStyle(
                  color: theme.colorScheme.onInverseSurface,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
              );
            }).toList(),
          ),
        ),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            color: color,
            barWidth: 3,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true,
              color: color.withValues(alpha: 0.14),
            ),
          ),
        ],
      ),
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
              backgroundColor: AppTheme.wantAccent.withValues(alpha: 0.15),
              foregroundColor: AppTheme.wantAccent),
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
