import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme.dart';
import '../../app/ui.dart';
import '../../app/widgets.dart';
import '../../core/logic/binder_value_snapshot.dart';
import '../../core/models/binder_entry.dart';
import '../../core/models/card_model.dart';
import '../../core/providers.dart';
import '../card_detail/card_detail_screen.dart';

/// Shell tab index of the Binder tab (see `HomeShell._screens`).
const binderTabIndex = 2;

/// Copies per printing across every owned Binder (Want List excluded).
Map<String, int> ownedCopiesByPrinting(Iterable<BinderEntry> entries) {
  final copies = <String, int>{};
  for (final e in entries) {
    if (e.isWanted || e.quantity < 1) continue;
    copies[e.card.id] = (copies[e.card.id] ?? 0) + e.quantity;
  }
  return copies;
}

/// Most recently added owned printings, newest first, one per printing.
List<BinderEntry> recentlyAdded(
  Iterable<BinderEntry> entries, {
  int limit = 10,
}) {
  final owned = entries.where((e) => !e.isWanted && e.quantity > 0).toList()
    ..sort((a, b) => b.addedAt.compareTo(a.addedAt));
  final seen = <String>{};
  return [
    for (final e in owned)
      if (seen.add(e.card.id)) e,
  ].take(limit).toList(growable: false);
}

/// Personal top of Browse: collection value with card and binder counts, and
/// recently added cards.
class HomeDashboard extends ConsumerWidget {
  const HomeDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final entries = ref.watch(binderProvider);
    final binders = ref.watch(bindersProvider);
    final pricing = ref.watch(pricingProvider);
    final copies = ownedCopiesByPrinting(entries);

    void openBinders() {
      ref.read(openBinderIdProvider.notifier).close();
      ref.read(shellTabProvider.notifier).go(binderTabIndex);
    }

    void openCard(CardModel card) {
      final catalog =
          ref.read(catalogProvider).asData?.value ?? const <CardModel>[];
      final full = catalog.where((c) => c.id == card.id).firstOrNull ?? card;
      Navigator.of(context).push(
        MaterialPageRoute(
          settings: const RouteSettings(name: 'Card Detail'),
          builder: (_) => CardDetailScreen(card: full),
        ),
      );
    }

    if (copies.isEmpty) {
      return _StartCollection(onTap: openBinders);
    }

    final cardCount = copies.values.fold<int>(0, (s, q) => s + q);
    final binderCount = binders.where((b) => b.isLive).length;
    double? total;
    for (final e in entries) {
      if (e.isWanted || e.quantity < 1) continue;
      final v = pricing.value(e.card);
      if (isPricedField(v)) total = (total ?? 0) + v! * e.quantity;
    }
    final added = recentlyAdded(entries);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _CollectionSummary(
          total: pricing.format(total),
          detail:
              '$cardCount ${cardCount == 1 ? 'card' : 'cards'} · '
              '$binderCount ${binderCount == 1 ? 'binder' : 'binders'}',
          onTap: openBinders,
        ),
        if (added.isNotEmpty) ...[
          SectionTitle(
            'Recently added',
            key: const Key('homeRecentlyAddedTitle'),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            trailing: TextButton(
              onPressed: openBinders,
              child: const Text('My Binders'),
            ),
          ),
          SizedBox(
            height: 138,
            child: ListView.separated(
              key: const Key('homeRecentlyAdded'),
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: added.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (context, i) => _RecentCard(
                entry: added[i],
                onTap: () => openCard(added[i].card),
              ),
            ),
          ),
        ],
        const SizedBox(height: 8),
      ],
    );
  }
}

class _CollectionSummary extends StatelessWidget {
  const _CollectionSummary({
    required this.total,
    required this.detail,
    required this.onTap,
  });

  final String total;
  final String detail;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = context.tokens;
    return Panel(
      key: const Key('homeCollectionSummary'),
      margin: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
      onTap: onTap,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'YOUR COLLECTION',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.9,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  total,
                  key: const Key('homeCollectionValue'),
                  style: AppType.tabular(
                    theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                const SizedBox(height: 2),
                Text(detail, style: theme.textTheme.bodySmall),
              ],
            ),
          ),
          Icon(Icons.chevron_right, color: t.textFaint),
        ],
      ),
    );
  }
}

class _RecentCard extends StatelessWidget {
  const _RecentCard({required this.entry, required this.onTap});

  final BinderEntry entry;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final card = entry.card;
    return InkWell(
      key: Key('homeRecent-${card.id}'),
      onTap: onTap,
      borderRadius: AppRadii.mdAll,
      child: SizedBox(
        width: 76,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CardThumbnail(
              url: card.imageUrl,
              foil: card.isFoil,
              width: 76,
              height: 106,
            ),
            const SizedBox(height: 4),
            Text(
              card.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelSmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _StartCollection extends StatelessWidget {
  const _StartCollection({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final t = context.tokens;
    return Panel(
      key: const Key('homeStartCollection'),
      margin: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
      onTap: onTap,
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: t.accentSoft,
              borderRadius: AppRadii.mdAll,
            ),
            child: Icon(
              Icons.collections_bookmark_outlined,
              color: t.accentText,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Start your collection',
                  style: theme.textTheme.titleSmall,
                ),
                Text(
                  'Scan or search cards to track their value here',
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
          Icon(Icons.chevron_right, color: t.textFaint),
        ],
      ),
    );
  }
}
