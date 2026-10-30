import 'dart:async';
import 'dart:convert';

import 'package:rifttrades/core/data/trade_link_shortener.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const longLink = 'https://riftrades.com/?trade=eyJ2IjoxfQ%3D%3D';

  test('posts the trade param and returns the short link', () async {
    Uri? endpoint;
    String? body;
    final shortener = TradeLinkShortener(
      post: (uri, json) async {
        endpoint = uri;
        body = json;
        return jsonEncode({'url': 'https://riftrades.com/t/aB3dE5gH'});
      },
    );

    expect(
      await shortener.shorten(longLink),
      'https://riftrades.com/t/aB3dE5gH',
    );
    expect(endpoint.toString(), 'https://riftrades.com/api/trade-links');
    expect(jsonDecode(body!), {'trade': 'eyJ2IjoxfQ=='});
  });

  test('falls back to the long link on any failure', () async {
    Future<String> shorten(Future<String?> Function(Uri, String) post) =>
        TradeLinkShortener(
          post: post,
          timeout: const Duration(milliseconds: 50),
        ).shorten(longLink);

    expect(await shorten((_, _) async => null), longLink);
    expect(await shorten((_, _) async => throw Exception('offline')), longLink);
    expect(await shorten((_, _) async => 'not json'), longLink);
    expect(
      await shorten(
        (_, _) async => jsonEncode({'url': 'https://evil.example/t/x'}),
      ),
      longLink,
    );
    expect(await shorten((_, _) => Completer<String?>().future), longLink);
  });

  test('leaves links without a trade alone', () async {
    final shortener = TradeLinkShortener(post: (_, _) async => fail('no call'));
    expect(
      await shortener.shorten('https://riftrades.com/'),
      'https://riftrades.com/',
    );
  });
}
