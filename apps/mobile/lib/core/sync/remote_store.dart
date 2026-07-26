import 'package:supabase_flutter/supabase_flutter.dart';

/// The server half of a synced collection: everything the engine needs from a
/// remote table, and nothing more.
///
/// An interface rather than a direct Postgrest call so reconciliation can be tested
/// against a fake. The merge rules are where the bugs hide, and they are not worth
/// exercising only through a live database.
abstract class RemoteCollection {
  /// Every row this user owns, tombstones included. Deletions have to come back or
  /// the client cannot tell a deleted record from one it has never seen.
  Future<List<Map<String, dynamic>>> fetchAll(String userId);

  Future<void> upsertAll(List<Map<String, Object?>> rows);

  /// Tombstones the row matching [identity], which is scoped to [userId].
  Future<void> markDeleted({
    required String userId,
    required Map<String, Object?> identity,
    required DateTime at,
  });
}

/// Walks a PostgREST-capped table by ordered ranges until a short page.
///
/// Exposed so tests can drive the same loop against an in-memory capped store
/// without a live [SupabaseClient].
Future<List<Map<String, dynamic>>> fetchAllPages({
  required Future<List<Map<String, dynamic>>> Function(int from, int to)
      loadPage,
  int pageSize = 1000,
}) async {
  final all = <Map<String, dynamic>>[];
  for (var from = 0;; from += pageSize) {
    final rows = await loadPage(from, from + pageSize - 1);
    all.addAll(rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

class SupabaseRemoteCollection implements RemoteCollection {
  SupabaseRemoteCollection({
    required this.client,
    required this.table,
    required this.conflictTarget,
  });

  final SupabaseClient client;
  final String table;

  /// Columns forming the unique constraint an upsert conflicts on.
  final String conflictTarget;

  @override
  Future<List<Map<String, dynamic>>> fetchAll(String userId) {
    // PostgREST caps a response at max_rows (1000). Without an order the cap
    // also makes which rows come back arbitrary, so page explicitly.
    return fetchAllPages(
      loadPage: (from, to) async {
        final page = await client
            .from(table)
            .select()
            .eq('user_id', userId)
            .order('id')
            .range(from, to);
        return page.cast<Map<String, dynamic>>();
      },
    );
  }

  @override
  Future<void> upsertAll(List<Map<String, Object?>> rows) async {
    if (rows.isEmpty) return;
    await client.from(table).upsert(rows, onConflict: conflictTarget);
  }

  @override
  Future<void> markDeleted({
    required String userId,
    required Map<String, Object?> identity,
    required DateTime at,
  }) async {
    final stamp = at.toIso8601String();
    await client.from(table).update({
      'deleted_at': stamp,
      'updated_at': stamp,
    }).match(<String, Object>{
      'user_id': userId,
      for (final e in identity.entries)
        if (e.value != null) e.key: e.value!,
    });
  }
}

/// The single `rift_user_settings` row for one account.
abstract class RemoteSettings {
  Future<Map<String, dynamic>?> fetch(String userId);

  Future<void> upsert({
    required String userId,
    required String priceSource,
    required String themeMode,
    required DateTime updatedAt,
  });
}

class SupabaseRemoteSettings implements RemoteSettings {
  SupabaseRemoteSettings(this.client);

  final SupabaseClient client;

  @override
  Future<Map<String, dynamic>?> fetch(String userId) => client
      .from('rift_user_settings')
      .select()
      .eq('user_id', userId)
      .maybeSingle();

  @override
  Future<void> upsert({
    required String userId,
    required String priceSource,
    required String themeMode,
    required DateTime updatedAt,
  }) async {
    await client.from('rift_user_settings').upsert({
      'user_id': userId,
      'price_source': priceSource,
      'theme_mode': themeMode,
      'updated_at': updatedAt.toIso8601String(),
    }, onConflict: 'user_id');
  }
}
