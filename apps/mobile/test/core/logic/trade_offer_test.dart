import 'dart:convert';

import 'package:rifttrades/core/logic/trade_offer.dart';
import 'package:rifttrades/core/models/trade.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/fixtures.dart';

// The link half must stay readable by the web's decodeTradeFromURL.

TradeItem _item(
  String name, {
  String id = 'card-1',
  String? subTypeName,
  double price = 0,
  int quantity = 1,
}) =>
    TradeItem(
      card: buildCard(id: id, name: name, subTypeName: subTypeName),
      priceEach: price,
      quantity: quantity,
    );

Trade _trade({
  List<TradeItem> have = const [],
  List<TradeItem> want = const [],
}) =>
    Trade(
      id: 'draft',
      createdAt: DateTime(2026, 10, 19),
      haveItems: have,
      wantItems: want,
    );

void main() {
  group('cardLine', () {
    test('keeps the full name and marks a foil, with a rounded price', () {
      expect(
        TradeOffer.cardLine(_item(
          'Yasuo, Windrider (Alternate Art)',
          subTypeName: 'Foil',
          price: 40.2,
        )),
        'Foil Yasuo, Windrider (Alternate Art) 40',
      );
    });

    test('prefixes the quantity when more than one', () {
      expect(
        TradeOffer.cardLine(_item(
          'Long Sword',
          subTypeName: 'Normal',
          price: 12,
          quantity: 3,
        )),
        '3x Long Sword 12',
      );
    });
  });

  group('message', () {
    test('is empty for an empty trade', () {
      expect(TradeOffer.message(_trade()), '');
    });

    test('offers my cards for theirs with the cash difference', () {
      final text = TradeOffer.message(
        _trade(
          have: [_item('Blade Dancer', subTypeName: 'Normal', price: 20)],
          want: [
            _item('Kai\'Sa, Survivor', subTypeName: 'Foil', price: 30),
          ],
        ),
        pricedAsOf: DateTime(2026, 10, 19),
      );
      expect(
        text,
        'Hey — I can do this trade:\n'
        '\n'
        '**I can offer**\n'
        'Blade Dancer 20\n'
        '+ \$10 cash from me\n'
        '\n'
        '**For your**\n'
        'Foil Kai\'Sa, Survivor 30\n'
        '\n'
        'Priced via TCGPlayer, Oct 19, 2026\n'
        'Balanced on riftrades.com\n',
      );
    });

    test('asks for anything back when only my side has cards', () {
      final text = TradeOffer.message(
        _trade(have: [_item('Blade Dancer', price: 20)]),
        pricedAsOf: DateTime(2026, 10, 19),
      );
      expect(text, contains('**For**\nwhatever you want to send back / cash'));
    });
  });

  group('link', () {
    test('is null for an empty trade', () {
      expect(TradeOffer.link(_trade()), isNull);
    });

    test('encodes the payload the website decodes', () {
      final now = DateTime.fromMillisecondsSinceEpoch(60000 * 1000);
      final link = TradeOffer.link(
        _trade(
          have: [_item('Mine', id: '684123-Normal', price: 2.5, quantity: 2)],
          want: [_item('Theirs', id: '700001-Foil', price: 9)],
        ),
        now: now,
      )!;

      final uri = Uri.parse(link);
      expect(uri.origin, 'https://riftrades.com');
      final payload =
          jsonDecode(utf8.decode(base64Decode(uri.queryParameters['trade']!)));
      expect(payload, {
        'v': 1,
        't': 1000,
        'h': [
          ['684123-Normal', 2.5, 2],
        ],
        'w': [
          ['700001-Foil', 9.0, 1],
        ],
      });
    });
  });
}
