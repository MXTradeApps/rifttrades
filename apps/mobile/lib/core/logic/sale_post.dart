// "Post for sale" composer: turns Binder cards into a WTS post for a Riftbound
// Discord trading channel or a Facebook selling group.
//
// Reimplemented in JavaScript at `apps/web/src/utils/salePost.js`. Both are
// pinned to the `sale_post.json` fixture (test/fixtures here, tests/fixtures
// on the web), so changing behaviour here without changing it there fails.

enum SalePlatform { discord, facebook }

/// Discord rejects messages over 2,000 characters.
const discordMessageLimit = 2000;

const salePostPercents = [100, 95, 90, 85, 80];

/// One printing to list. [finish] is the catalog subtype ("Foil").
class SaleItem {
  const SaleItem({
    required this.name,
    this.finish,
    this.condition = 'NM',
    this.quantity = 1,
    this.price,
  });

  final String name;
  final String? finish;
  final String condition;
  final int quantity;
  final double? price;
}

/// Asking price in cents after the percent-of-market discount. At $10 and up
/// it is rounded to whole units, so totals add up to what the post shows.
int? salePriceCents(double? price, int percent) {
  if (price == null || !price.isFinite || price <= 0) return null;
  final cents = (price * percent).round();
  if (cents <= 0) return null;
  return cents >= 1000 ? (cents / 100).round() * 100 : cents;
}

/// Whole units at $10 and up, cents below, e.g. "$36" or "$4.50".
String formatSalePrice(int cents, String symbol) {
  if (cents >= 1000) return '$symbol${(cents / 100).round()}';
  final rest = (cents % 100).toString().padLeft(2, '0');
  return '$symbol${cents ~/ 100}.$rest';
}

/// Build the post. Discord posts split into several messages when they would
/// pass Discord's character limit; Facebook posts are always one message.
List<String> buildSalePost({
  required SalePlatform platform,
  required Iterable<SaleItem> items,
  int percent = 100,
  String symbol = r'$',
  String sourceLabel = 'TCGplayer',
  String pricedOn = '',
  String link = '',
  int limit = discordMessageLimit,
}) {
  final sorted = [
    for (final item in items)
      if (item.quantity > 0)
        (item: item, cents: salePriceCents(item.price, percent)),
  ]..sort((a, b) {
      final byPrice = (b.cents ?? -1) - (a.cents ?? -1);
      return byPrice != 0 ? byPrice : a.item.name.compareTo(b.item.name);
    });
  if (sorted.isEmpty) return const [];

  final cardCount = sorted.fold<int>(0, (sum, e) => sum + e.item.quantity);
  final totalCents =
      sorted.fold<int>(0, (sum, e) => sum + (e.cents ?? 0) * e.item.quantity);
  final cardsLabel = '$cardCount ${cardCount == 1 ? 'card' : 'cards'}';
  final total =
      totalCents > 0 ? ' · ${formatSalePrice(totalCents, symbol)} total' : '';
  final basis = _priceBasis(percent, sourceLabel, pricedOn);
  final closing = link.isNotEmpty ? 'Full list: $link' : 'Priced on riftrades.com';

  if (platform == SalePlatform.facebook) {
    return [
      [
        'WTS - Riftbound singles',
        'Prices are $basis. All NM unless noted. Comment or message me!',
        '',
        for (final e in sorted) _facebookLine(e.item, e.cents, symbol),
        '',
        '$cardsLabel$total',
        closing,
      ].join('\n'),
    ];
  }

  final header =
      ['**WTS** · prices are $basis', 'All NM unless noted. DM me!', '']
          .join('\n');
  final footer = ['', '$cardsLabel$total', closing].join('\n');
  return _packMessages([
    header,
    for (final e in sorted) _discordLine(e.item, e.cents, symbol),
    footer,
  ], limit);
}

String _priceBasis(int percent, String sourceLabel, String pricedOn) {
  final market = '$sourceLabel market';
  final basis = percent == 100 ? market : '$percent% of $market';
  return pricedOn.isNotEmpty ? '$basis ($pricedOn)' : basis;
}

String _conditionLabel(String condition) {
  final value = condition.trim().toUpperCase();
  return value.isNotEmpty && value != 'NM' ? value : '';
}

String _fullFinish(String? finish) {
  final value = (finish ?? '').trim();
  if (value.isEmpty || value.toLowerCase() == 'normal') return '';
  return value;
}

/// Riftbound has no settled Discord shorthand for variants, so card names stay
/// whole ("Yasuo, Windrider (Alternate Art)") and foils are just marked "Foil".
String _foilLabel(String? finish) =>
    (finish ?? '').toLowerCase().contains('foil') ? 'Foil' : '';

String _discordLine(SaleItem item, int? cents, String symbol) {
  final name = item.name.trim();
  final condition = _conditionLabel(item.condition);
  final foil = _foilLabel(item.finish);
  return [
    if (item.quantity > 1) '${item.quantity}x',
    if (foil.isNotEmpty) foil,
    name.isEmpty ? 'Unknown card' : name,
    if (condition.isNotEmpty) '($condition)',
    if (cents != null)
      '${formatSalePrice(cents, symbol)}${item.quantity > 1 ? ' ea' : ''}',
  ].join(' ');
}

String _facebookLine(SaleItem item, int? cents, String symbol) {
  final trimmed = item.name.trim();
  final details = [
    _fullFinish(item.finish),
    _conditionLabel(item.condition),
  ].where((d) => d.isNotEmpty).toList();
  final name = trimmed.isEmpty ? 'Unknown card' : trimmed;
  final buffer = StringBuffer(item.quantity > 1 ? '${item.quantity}x ' : '')
    ..write(name);
  if (details.isNotEmpty) buffer.write(' (${details.join(', ')})');
  if (cents != null) {
    buffer.write(' - ${formatSalePrice(cents, symbol)}');
    if (item.quantity > 1) buffer.write(' each');
  }
  return buffer.toString();
}

/// Pack lines into as few messages as fit under [limit].
List<String> _packMessages(List<String> blocks, int limit) {
  final messages = <String>[];
  var current = '';
  for (final block in blocks) {
    final next = current.isEmpty ? block : '$current\n$block';
    if (current.isNotEmpty && next.length > limit) {
      messages.add(current);
      current = block;
    } else {
      current = next;
    }
  }
  if (current.isNotEmpty) messages.add(current);
  return [for (final m in messages) m.trim()];
}
