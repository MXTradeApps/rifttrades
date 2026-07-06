import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/lend_entry.dart';

class LendRepository {
  LendRepository(this._prefs);
  final SharedPreferences _prefs;
  static const _key = 'lend_entries';

  List<LendEntry> load() {
    final raw = _prefs.getString(_key);
    if (raw == null) return [];
    try {
      final list = jsonDecode(raw) as List;
      return list
          .map((e) => LendEntry.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> save(List<LendEntry> entries) => _prefs.setString(
      _key, jsonEncode(entries.map((e) => e.toJson()).toList()));
}
