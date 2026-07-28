/// Generates the perceptual-hash asset used by the card scanner.
///
/// Downloads every (non-sealed) card image referenced by the Supabase catalog,
/// computes a 256-bit pHash per unique image with the exact same code the app
/// runs on camera frames (`lib/core/scan/phash.dart`), and writes
/// `assets/scan/card_hashes.json`.
///
/// Run from the `app/` directory whenever a new set is released:
///
///     dart run tool/generate_card_hashes.dart
///
/// Images are cached under `tool/.cache/images/` so re-runs only download new
/// cards. The tool ends by printing distance statistics between distinct
/// images so hash discriminability can be sanity-checked.
library;

import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:image/image.dart' as img;
import 'package:rifttrades/core/scan/phash.dart';

const _supabaseUrl = 'https://cnmxaccamqshgvesieez.supabase.co';
const _supabaseKey = 'sb_publishable_4hW7qDSTmCljfKl-dB43kQ_xSk0JFom';
const _outputPath = 'assets/scan/card_hashes.json';
const _cacheDir = 'tool/.cache/images';
const _downloadConcurrency = 8;

Future<void> main() async {
  final client = HttpClient();
  try {
    stdout.writeln('Fetching catalog from Supabase…');
    final rows = await _fetchCatalog(client);
    stdout.writeln('  ${rows.length} printings.');

    // Finishes share scans: group card ids by image URL and hash each image once.
    final idsByUrl = <String, List<String>>{};
    for (final row in rows) {
      final url = row.imageUrl;
      if (url == null || url.isEmpty) continue;
      idsByUrl.putIfAbsent(url, () => []).add(row.id);
    }
    stdout.writeln('  ${idsByUrl.length} unique images to hash.');

    Directory(_cacheDir).createSync(recursive: true);
    final urls = idsByUrl.keys.toList();
    final hashes = <String, String>{}; // url -> hex hash
    final failures = <String>[];

    var done = 0;
    for (var i = 0; i < urls.length; i += _downloadConcurrency) {
      final batch = urls.skip(i).take(_downloadConcurrency);
      await Future.wait(batch.map((url) async {
        try {
          final bytes = await _fetchImage(client, url);
          final decoded = img.decodeImage(bytes);
          if (decoded == null) throw const FormatException('undecodable image');
          hashes[url] = _hex(_hashDecodedImage(decoded));
        } catch (e) {
          failures.add('$url  ($e)');
        } finally {
          done++;
          if (done % 100 == 0 || done == urls.length) {
            stdout.writeln('  hashed $done/${urls.length}');
          }
        }
      }));
    }

    if (failures.isNotEmpty) {
      stdout.writeln('WARNING: ${failures.length} images failed:');
      failures.take(20).forEach((f) => stdout.writeln('  $f'));
    }

    final entries = [
      for (final url in urls)
        if (hashes.containsKey(url))
          {'h': hashes[url], 'ids': idsByUrl[url]},
    ];
    final out = File(_outputPath)..parent.createSync(recursive: true);
    out.writeAsStringSync(json.encode({
      'version': 1,
      'hashBits': kHashBits,
      'generatedAt': DateTime.now().toUtc().toIso8601String(),
      'entries': entries,
    }));
    stdout.writeln('Wrote ${entries.length} hashes to $_outputPath '
        '(${(out.lengthSync() / 1024).toStringAsFixed(0)} KB).');

    _printDistanceStats(entries);
  } finally {
    client.close();
  }
}

class _CatalogRow {
  _CatalogRow(this.id, this.imageUrl);
  final String id;
  final String? imageUrl;
}

Future<List<_CatalogRow>> _fetchCatalog(HttpClient client) async {
  const pageSize = 1000;
  final rows = <_CatalogRow>[];
  var from = 0;
  while (true) {
    final uri = Uri.parse(
        '$_supabaseUrl/rest/v1/cards_with_prices?select=id,image_url&is_sealed=eq.false&order=id');
    final request = await client.getUrl(uri);
    request.headers
      ..set('apikey', _supabaseKey)
      ..set('Authorization', 'Bearer $_supabaseKey')
      ..set('Range-Unit', 'items')
      ..set('Range', '$from-${from + pageSize - 1}');
    final response = await request.close();
    if (response.statusCode >= 300) {
      throw HttpException('Supabase returned ${response.statusCode}');
    }
    final body = await response.transform(utf8.decoder).join();
    final page = (json.decode(body) as List)
        .map((r) => _CatalogRow(
            (r as Map<String, dynamic>)['id'] as String,
            r['image_url'] as String?))
        .toList();
    rows.addAll(page);
    if (page.length < pageSize) return rows;
    from += pageSize;
  }
}

Future<Uint8List> _fetchImage(HttpClient client, String url) async {
  final cacheFile =
      File('$_cacheDir/${url.hashCode.toUnsigned(32).toRadixString(16)}_${Uri.parse(url).pathSegments.last}');
  if (cacheFile.existsSync()) return cacheFile.readAsBytes();

  final request = await client.getUrl(Uri.parse(url));
  final response = await request.close();
  if (response.statusCode != 200) {
    throw HttpException('HTTP ${response.statusCode}');
  }
  final builder = BytesBuilder(copy: false);
  await for (final chunk in response) {
    builder.add(chunk);
  }
  final bytes = builder.takeBytes();
  cacheFile.writeAsBytesSync(bytes);
  return bytes;
}

Uint8List _hashDecodedImage(img.Image image) {
  return phashOfImage(
    width: image.width,
    height: image.height,
    lumaAt: (x, y) {
      final p = image.getPixel(x, y);
      return 0.299 * p.r + 0.587 * p.g + 0.114 * p.b;
    },
  );
}

String _hex(Uint8List bytes) =>
    bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();

/// Reports how separated distinct card images are in hash space: the minimum
/// pairwise distance and the low percentiles. If many pairs sit at tiny
/// distances the scanner will surface them as ties for OCR disambiguation.
void _printDistanceStats(List<Map<String, Object?>> entries) {
  final hashes = entries
      .map((e) => _unhex(e['h'] as String))
      .toList(growable: false);
  if (hashes.length < 2) return;

  var minDist = kHashBits;
  final all = <int>[];
  for (var i = 0; i < hashes.length; i++) {
    for (var j = i + 1; j < hashes.length; j++) {
      final d = hammingDistance(hashes[i], hashes[j]);
      all.add(d);
      if (d < minDist) minDist = d;
    }
  }
  all.sort();
  int pct(double p) => all[(p * (all.length - 1)).round()];
  final under20 = all.where((d) => d < 20).length;
  stdout
    ..writeln('Inter-image distance stats (${all.length} pairs):')
    ..writeln('  min=$minDist  p0.1%=${pct(0.001)}  p1%=${pct(0.01)}  '
        'median=${pct(0.5)}')
    ..writeln('  pairs closer than 20 bits: $under20 '
        '(these will surface as scan ties)');
}

Uint8List _unhex(String hex) {
  final bytes = Uint8List(hex.length ~/ 2);
  for (var i = 0; i < bytes.length; i++) {
    bytes[i] = int.parse(hex.substring(i * 2, i * 2 + 2), radix: 16);
  }
  return bytes;
}
