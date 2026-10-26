import 'dart:convert';

import '../models/trade.dart';

/// Discord trade-offer text and share links for a trade.
///
/// The link uses the web's `{v, t, h, w}` payload, which
/// `decodeTradeFromURL` reads, so it opens the same trade on riftrades.com.
/// Keep the two in step.
class TradeOffer {
  const TradeOffer._();

  static const siteUrl = 'https://riftrades.com';

  static const _months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  /// One card line, e.g. "2x Foil Yasuo, Windrider (Alternate Art) 40".
  ///
  /// Riftbound has no settled Discord shorthand for variants, so the name
  /// stays whole and a foil printing is marked "Foil".
  static String cardLine(TradeItem item) {
    final foil = item.card.isFoil ||
        (item.card.subTypeName ?? '').toLowerCase().contains('foil');
    final price = item.priceEach.round();
    return [
      if (item.quantity > 1) '${item.quantity}x',
      if (foil) 'Foil',
      item.card.name.trim(),
      if (price > 0) '$price',
    ].join(' ');
  }

  /// A message to paste to a Discord poster. "My cards" are what I offer;
  /// "Their cards" are what I'd take from their post. Empty for an empty trade.
  static String message(Trade trade, {DateTime? pricedAsOf}) {
    final have = trade.haveItems;
    final want = trade.wantItems;
    if (have.isEmpty && want.isEmpty) return '';

    final diff = trade.haveTotal - trade.wantTotal;
    final cash = '\$${diff.abs().round()}';
    final lines = <String>['Hey — I can do this trade:', ''];

    if (have.isNotEmpty) {
      lines.add('**I can offer**');
      lines.addAll(have.map(cardLine));
      if (diff < -0.5) lines.add('+ $cash cash from me');
      lines.add('');
    }

    if (want.isNotEmpty) {
      lines.add('**For your**');
      lines.addAll(want.map(cardLine));
      if (diff > 0.5) lines.add('+ $cash cash from you');
    } else {
      lines.add('**For**');
      lines.add('whatever you want to send back / cash');
    }

    final date = pricedAsOf ?? DateTime.now();
    lines
      ..add('')
      ..add('Priced via TCGPlayer, '
          '${_months[date.month - 1]} ${date.day}, ${date.year}')
      ..add('Balanced on ${siteUrl.replaceFirst(RegExp(r'^https?://'), '')}');

    return '${lines.join('\n').trim()}\n';
  }

  /// A riftrades.com link that opens this trade on the website, in the
  /// `{v, t, h, w}` payload the web's `decodeTradeFromURL` reads. Null for an
  /// empty trade.
  static String? link(Trade trade, {DateTime? now}) {
    List<List<Object>> minimal(List<TradeItem> items) => [
          for (final item in items)
            [item.card.id, item.priceEach, item.quantity],
        ];

    if (trade.haveItems.isEmpty && trade.wantItems.isEmpty) return null;
    final minutes =
        ((now ?? DateTime.now()).millisecondsSinceEpoch / 60000).round();
    final payload = jsonEncode({
      'v': 1,
      't': minutes,
      'h': minimal(trade.haveItems),
      'w': minimal(trade.wantItems),
    });
    final encoded = base64Encode(utf8.encode(payload));
    return Uri.parse(siteUrl)
        .replace(path: '/', queryParameters: {'trade': encoded})
        .toString();
  }
}
