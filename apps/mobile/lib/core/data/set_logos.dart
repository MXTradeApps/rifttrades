import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

/// Official Riftbound set logo / key-art URLs from UVS retailer marketing
/// assets.
///
/// Bundled as `assets/setLogos.json`, keyed by TCGplayer group id — which
/// matches [CardModel.setId]. Values may be HTTPS CDN URLs or bundled asset
/// refs of the form `asset:set_logos/<groupId>.png`.
class SetLogoMap {
  const SetLogoMap(this._byGroupId);

  final Map<String, String> _byGroupId;

  static const empty = SetLogoMap({});

  /// Parse the scraped JSON blob. Tolerates either
  /// `{ "logos": { "24344": { "logoUrl": "…" } } }` or a flat
  /// `{ "24344": "asset:…" }` map.
  factory SetLogoMap.fromJson(String jsonText) {
    final decoded = jsonDecode(jsonText);
    if (decoded is! Map) return empty;

    final raw = decoded['logos'] is Map
        ? decoded['logos'] as Map
        : decoded;
    final map = <String, String>{};
    for (final entry in raw.entries) {
      final key = entry.key.toString();
      final value = entry.value;
      String? url;
      if (value is String) {
        url = value;
      } else if (value is Map) {
        final logoUrl = value['logoUrl'];
        if (logoUrl is String) url = logoUrl;
      }
      if (url != null && url.isNotEmpty) map[key] = url;
    }
    return SetLogoMap(map);
  }

  String? urlForGroupId(int? groupId) {
    if (groupId == null) return null;
    return _byGroupId[groupId.toString()];
  }

  /// All distinct logo refs (for disk/memory cache warming).
  Iterable<String> get urls => _byGroupId.values;

  bool get isEmpty => _byGroupId.isEmpty;
  int get length => _byGroupId.length;
}

/// Load the bundled set-logo map. Returns [SetLogoMap.empty] on any failure
/// so the browse UI can fall back to set names without crashing.
Future<SetLogoMap> loadSetLogoMap() async {
  try {
    final jsonText = await rootBundle.loadString('assets/setLogos.json');
    return SetLogoMap.fromJson(jsonText);
  } catch (_) {
    return SetLogoMap.empty;
  }
}

/// Whether [ref] points at a Flutter asset (`asset:path/to.png`).
bool isAssetLogoRef(String? ref) =>
    ref != null && ref.startsWith('asset:') && ref.length > 'asset:'.length;

/// Strip the `asset:` prefix from a bundled logo ref.
String assetPathFromLogoRef(String ref) => ref.substring('asset:'.length);
