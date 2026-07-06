import 'package:cached_network_image/cached_network_image.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../app/theme.dart';
import '../../app/widgets.dart';
import '../../core/models/app_settings.dart';
import '../../core/models/card_model.dart';
import '../../core/models/trade.dart';
import '../../core/providers.dart';

class CardDetailScreen extends ConsumerStatefulWidget {
  const CardDetailScreen({super.key, required this.card});
  final CardModel card;

  @override
  ConsumerState<CardDetailScreen> createState() => _CardDetailScreenState();
}

class _CardDetailScreenState extends ConsumerState<CardDetailScreen> {
  late CardModel _selected = widget.card;
  late Future<List<CardModel>> _printings;
  late Future<List<PricePoint>> _history;

  @override
  void initState() {
    super.initState();
    final repo = ref.read(cardRepositoryProvider);
    _printings = repo.printingsForName(widget.card.name);
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
    final owned = ref.watch(collectionProvider.notifier).quantityOf(_selected.id);

    return Scaffold(
      appBar: AppBar(title: Text(_selected.name)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
        children: [
          Center(
            child: Hero(
              tag: 'card_${_selected.id}',
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: CachedNetworkImage(
                  imageUrl: _selected.imageUrl ?? '',
                  height: 340,
                  fit: BoxFit.contain,
                  placeholder: (_, _) => const SizedBox(
                    height: 340,
                    child: Center(child: CircularProgressIndicator()),
                  ),
                  errorWidget: (_, _, _) => Container(
                    height: 340,
                    width: 244,
                    color: theme.colorScheme.surfaceContainerHighest,
                    child: const Icon(Icons.broken_image_outlined, size: 48),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(_selected.name,
              style: theme.textTheme.headlineSmall
                  ?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          CardMetaLine(card: _selected, style: theme.textTheme.bodyMedium),
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
                PillBadge(
                    label: 'Owned ×$owned',
                    color: AppTheme.positive,
                    icon: Icons.check),
            ],
          ),
          const SizedBox(height: 20),
          _PrintingSelector(
            printings: _printings,
            selectedId: _selected.id,
            onSelect: _select,
          ),
          const SizedBox(height: 20),
          _PriceCard(card: _selected, settings: settings, pricing: pricing),
          const SizedBox(height: 20),
          _HistorySection(history: _history, settings: settings),
        ],
      ),
      bottomNavigationBar: _ActionBar(card: _selected),
    );
  }
}

class _PrintingSelector extends StatelessWidget {
  const _PrintingSelector({
    required this.printings,
    required this.selectedId,
    required this.onSelect,
  });
  final Future<List<CardModel>> printings;
  final String selectedId;
  final ValueChanged<CardModel> onSelect;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<CardModel>>(
      future: printings,
      builder: (context, snap) {
        final list = snap.data ?? const [];
        if (list.length < 2) return const SizedBox.shrink();
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Printings',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final c in list)
                  ChoiceChip(
                    label: Text(
                        '${c.finishLabel}${c.collectorNumber != null ? ' · #${c.collectorNumber}' : ''}'),
                    selected: c.id == selectedId,
                    onSelected: (_) => onSelect(c),
                  ),
              ],
            ),
          ],
        );
      },
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
        padding: const EdgeInsets.all(16),
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
                const Spacer(),
                PriceSourceBadge(source: settings.source.label),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Showing ${settings.source.label} · ${settings.type.label}',
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 12),
            _PriceGroup(title: 'TCGplayer (USD)', rows: tcgRows),
            const Divider(height: 24),
            _PriceGroup(title: 'CardMarket (EUR)', rows: cmRows),
            const SizedBox(height: 16),
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
            style: theme.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: theme.colorScheme.onSurfaceVariant)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            for (final r in rows)
              SizedBox(
                width: 92,
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
              height: 60, child: Center(child: CircularProgressIndicator()));
        }
        final points = snap.data ?? const [];
        final values = points
            .map((p) => settings.source == PriceSource.tcgplayer
                ? (settings.type == PriceType.market ? p.tcgMarket : p.tcgLow)
                : (settings.type == PriceType.market ? p.cmTrend : p.cmLow))
            .toList();
        final hasSeries = values.where((v) => v != null).length >= 2;

        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
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
                const SizedBox(height: 12),
                if (!hasSeries)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 20),
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
                    height: 160,
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
    final spots = <FlSpot>[];
    for (var i = 0; i < values.length; i++) {
      final v = values[i];
      if (v != null) spots.add(FlSpot(i.toDouble(), v));
    }
    return LineChart(
      LineChartData(
        gridData: const FlGridData(show: false),
        titlesData: const FlTitlesData(show: false),
        borderData: FlBorderData(show: false),
        lineTouchData: const LineTouchData(enabled: true),
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
    void snack(String msg) => ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), duration: const Duration(seconds: 2)));

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: Row(
          children: [
            Expanded(
              child: FilledButton.tonalIcon(
                style: FilledButton.styleFrom(
                    backgroundColor: AppTheme.haveAccent.withValues(alpha: 0.15),
                    foregroundColor: AppTheme.haveAccent),
                icon: const Icon(Icons.add),
                label: const Text('Have'),
                onPressed: () {
                  ref
                      .read(tradeDraftProvider.notifier)
                      .addCard(TradeSide.have, card);
                  snack('Added to Have');
                },
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: FilledButton.tonalIcon(
                style: FilledButton.styleFrom(
                    backgroundColor: AppTheme.wantAccent.withValues(alpha: 0.15),
                    foregroundColor: AppTheme.wantAccent),
                icon: const Icon(Icons.add),
                label: const Text('Want'),
                onPressed: () {
                  ref
                      .read(tradeDraftProvider.notifier)
                      .addCard(TradeSide.want, card);
                  snack('Added to Want');
                },
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: FilledButton.icon(
                icon: const Icon(Icons.style),
                label: const Text('Collect'),
                onPressed: () {
                  ref.read(collectionProvider.notifier).add(card);
                  snack('Added to Collection');
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
