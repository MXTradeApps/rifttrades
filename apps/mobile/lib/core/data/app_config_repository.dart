import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/app_config.dart';

class AppConfigRepository {
  AppConfigRepository(this._client);
  final SupabaseClient _client;

  /// Fetches the singleton `app_config` row, or `null` if missing/unreachable.
  Future<AppConfig?> fetch() async {
    final row = await _client.from('app_config').select().eq('id', 1).maybeSingle();
    if (row == null) return null;
    return AppConfig.fromJson(row);
  }
}
