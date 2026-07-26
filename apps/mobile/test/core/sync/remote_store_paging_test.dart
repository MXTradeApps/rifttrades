import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/sync/remote_store.dart';

/// Simulates a PostgREST table with `max_rows = 1000`.
///
/// An unpaged `select` returns at most [maxRows] rows, and without an order
/// which ones come back are arbitrary (here: insertion order). A ranged,
/// ordered query returns the requested slice — still at most [maxRows] long —
/// which is what [SupabaseRemoteCollection.fetchAll] relies on.
class FakePostgrestTable {
  FakePostgrestTable(this._rows, {this.maxRows = 1000});

  final List<Map<String, dynamic>> _rows;
  final int maxRows;

  /// Old client behaviour: one select, no order, no range.
  List<Map<String, dynamic>> selectUnpaged(String userId) {
    final matched = [
      for (final row in _rows)
        if (row['user_id'] == userId) Map<String, dynamic>.from(row),
    ];
    return matched.take(maxRows).toList();
  }

  /// What `.eq(...).order('id').range(from, to)` returns under the cap.
  List<Map<String, dynamic>> selectOrderedRange(
    String userId,
    int from,
    int to,
  ) {
    final matched = [
      for (final row in _rows)
        if (row['user_id'] == userId) Map<String, dynamic>.from(row),
    ]..sort((a, b) => (a['id'] as String).compareTo(b['id'] as String));

    if (from >= matched.length) return [];
    final endExclusive = math.min(to + 1, matched.length);
    final page = matched.sublist(from, endExclusive);
    // PostgREST still enforces max_rows on a single response.
    return page.take(maxRows).toList();
  }
}

void main() {
  const userId = '9f1c0b62-0000-4000-8000-000000000001';
  // One full page plus a remainder, so a single capped response cannot win.
  const rowCount = 1005;

  late FakePostgrestTable table;

  setUp(() {
    table = FakePostgrestTable([
      for (var i = 0; i < rowCount; i++)
        {
          'id': 'row-${i.toString().padLeft(4, '0')}',
          'user_id': userId,
          'card_id': 'card-$i',
        },
    ]);
  });

  test('fetchAllPages returns every row past the PostgREST max_rows cap',
      () async {
    // Drives the same helper [SupabaseRemoteCollection.fetchAll] uses.
    final rows = await fetchAllPages(
      loadPage: (from, to) async =>
          table.selectOrderedRange(userId, from, to),
    );

    expect(rows, hasLength(rowCount));
    expect(
      rows.map((r) => r['id']).toList(),
      [
        for (var i = 0; i < rowCount; i++)
          'row-${i.toString().padLeft(4, '0')}',
      ],
    );
  });

  test('unpaged select stops at max_rows — the bug the paging fix guards', () {
    // Same store, old client shape: one select, no order/range. Would be what
    // SupabaseRemoteCollection.fetchAll did before the page walk.
    final rows = table.selectUnpaged(userId);

    expect(rows, hasLength(1000));
    expect(rows, isNot(hasLength(rowCount)));
  });
}
