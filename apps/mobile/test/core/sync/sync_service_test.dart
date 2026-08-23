import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/data/binder_repository.dart';
import 'package:rifttrades/core/data/binders_repository.dart';
import 'package:rifttrades/core/data/lend_repository.dart';
import 'package:rifttrades/core/data/settings_repository.dart';
import 'package:rifttrades/core/data/trade_repository.dart';
import 'package:rifttrades/core/models/app_settings.dart';
import 'package:rifttrades/core/models/binder.dart';
import 'package:rifttrades/core/models/binder_entry.dart';
import 'package:rifttrades/core/models/lend_group.dart';
import 'package:rifttrades/core/models/trade.dart';
import 'package:rifttrades/core/providers.dart';
import 'package:rifttrades/core/sync/binder_sync.dart';
import 'package:rifttrades/core/sync/binders_sync.dart';
import 'package:rifttrades/core/sync/collection_sync.dart';
import 'package:rifttrades/core/sync/lend_sync.dart';
import 'package:rifttrades/core/sync/remote_store.dart';
import 'package:rifttrades/core/sync/settings_sync.dart';
import 'package:rifttrades/core/sync/sync_adapter.dart';
import 'package:rifttrades/core/sync/sync_journal.dart';
import 'package:rifttrades/core/sync/sync_service.dart';
import 'package:rifttrades/core/sync/trade_sync.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../support/fixtures.dart';
import 'settings_sync_test.dart' show FakeRemoteSettings;

const _alice = '9f1c0b62-0000-4000-8000-00000000000a';
const _bob = '9f1c0b62-0000-4000-8000-00000000000b';

/// Stands in for one table. Keyed by whatever the adapter says identifies a row, so
/// upsert conflicts and tombstone lookups agree with the real unique constraints.
class FakeTable implements RemoteCollection {
  FakeTable(this.keyOf);

  final String Function(Map<String, Object?> row) keyOf;
  final Map<String, Map<String, Object?>> rows = {};
  bool failOnRead = false;

  @override
  Future<List<Map<String, dynamic>>> fetchAll(String userId) async {
    if (failOnRead) throw Exception('unreachable');
    return [
      for (final row in rows.values)
        if (row['user_id'] == userId) Map<String, dynamic>.from(row),
    ];
  }

  @override
  Future<void> upsertAll(List<Map<String, Object?>> incoming) async {
    for (final row in incoming) {
      rows[keyOf(row)] = {...row};
    }
  }

  @override
  Future<void> markDeleted({
    required String userId,
    required Map<String, Object?> identity,
    required DateTime at,
  }) async {
    final row = rows[keyOf(identity)];
    if (row == null) return;
    row['deleted_at'] = at.toIso8601String();
    row['updated_at'] = at.toIso8601String();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SyncJournal journal;
  late BinderRepository binder;
  late BindersRepository binders;
  late LendRepository lend;
  late TradeRepository trades;
  late SettingsRepository settings;
  late FakeTable binderTable;
  late FakeTable bindersTable;
  late FakeTable lendTable;
  late FakeTable tradesTable;
  late FakeRemoteSettings settingsRow;
  late SyncService service;

  SyncService buildService() {
    CollectionSync<T> collection<T>(
      SyncAdapter<T> adapter,
      LocalCollection<T> local,
      RemoteCollection remote,
    ) {
      return CollectionSync(
        adapter: adapter,
        local: local,
        journal: journal,
        remote: remote,
      );
    }

    return SyncService(
      journal: journal,
      binder: collection(const BinderSyncAdapter(), binder, binderTable),
      binders: collection(const BindersSyncAdapter(), binders, bindersTable),
      lend: collection(const LendSyncAdapter(), lend, lendTable),
      trades: collection(const TradeSyncAdapter(), trades, tradesTable),
      settings: SettingsSync(
        repository: settings,
        remote: settingsRow,
        journal: journal,
      ),
    );
  }

  Future<void> build() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    journal = SyncJournal(prefs);
    binder = BinderRepository(prefs, journal);
    binders = BindersRepository(prefs, journal);
    lend = LendRepository(prefs, journal);
    trades = TradeRepository(prefs, journal);
    settings = SettingsRepository(prefs, journal);

    binderTable = FakeTable((row) => (row['client_id'] as String?) ??
        '${row['is_wanted']}|${row['card_id']}');
    bindersTable = FakeTable((row) => row['client_id'] as String);
    lendTable = FakeTable((row) => row['client_id'] as String);
    tradesTable = FakeTable((row) => row['client_id'] as String);
    settingsRow = FakeRemoteSettings();

    service = buildService();
  }

  setUp(build);

  BinderEntry someCard(String id) => BinderEntry(
        card: buildCard(id: id, name: 'Card $id'),
        addedAt: DateTime.utc(2026, 1, 1),
      );

  Future<void> seedLocalCollection() async {
    await binder.save([someCard('a')]);
    await lend.save([
      LendGroup(
        id: 'g1',
        personName: 'Sam',
        createdAt: DateTime.utc(2026, 3, 3),
        items: [LendItem(card: buildCard(id: 'x'), quantity: 2)],
      ),
    ]);
    await trades.save([
      Trade(
        id: 't1',
        createdAt: DateTime.utc(2026, 2, 2),
        haveItems: [TradeItem(card: buildCard(id: 'h'), priceEach: 3)],
      ),
    ]);
    await settings.save(const AppSettings(source: PriceSource.cardmarket));
  }

  group('first sign-in', () {
    test('uploads everything built while signed out', () async {
      await seedLocalCollection();

      await service.run(_alice);

      expect(binderTable.rows, hasLength(1));
      expect(lendTable.rows['g1']!['person_name'], 'Sam');
      expect(tradesTable.rows['t1']!['have_total'], 3);
      expect(settingsRow.row!['price_source'], 'cardmarket');
      expect(journal.syncedUserId, _alice);
    });

    test('a mobile trade carries the totals web renders', () async {
      await trades.save([
        Trade(
          id: 't1',
          createdAt: DateTime.utc(2026, 2, 2),
          haveItems: [TradeItem(card: buildCard(id: 'h'), priceEach: 10)],
          wantItems: [TradeItem(card: buildCard(id: 'w'), priceEach: 4)],
          wantCash: 2,
        ),
      ]);

      await service.run(_alice);

      final row = tradesTable.rows['t1']!;
      expect(row['have_total'], 10);
      expect(row['want_total'], 6);
      expect(row['diff'], 4);
      // Web's save dialog requires a name; a confirmed mobile trade has none.
      expect(row['name'], isNull);
      expect(row['client_id'], 't1');
    });
  });

  group('a different account signs in', () {
    test('does not upload the previous account\'s collection', () async {
      await seedLocalCollection();
      await service.run(_alice);

      await service.run(_bob);

      expect(
        binderTable.rows.values.where((r) => r['user_id'] == _bob),
        isEmpty,
        reason: "one customer's binder must never land in another's account",
      );
      expect(lendTable.rows.values.where((r) => r['user_id'] == _bob), isEmpty);
      expect(binder.load(), isEmpty);
      expect(
        binders.load().where((b) => b.isLive).map((b) => b.clientId),
        containsAll([BinderIds.trade, BinderIds.collection]),
      );
      expect(lend.load(), isEmpty);
      expect(trades.load(), isEmpty);
      expect(journal.syncedUserId, _bob);
    });

    test('leaves the first account\'s uploaded data intact', () async {
      await seedLocalCollection();
      await service.run(_alice);

      await service.run(_bob);

      expect(binderTable.rows.values.single['user_id'], _alice);
      expect(binderTable.rows.values.single['deleted_at'], isNull);
    });

    test('keeps device preferences rather than resetting the theme', () async {
      await settings.save(const AppSettings(themeMode: AppThemeMode.light));
      await service.run(_alice);

      await service.run(_bob);

      expect(settings.load().themeMode, AppThemeMode.light);
    });

    test('signing back in restores what was uploaded', () async {
      await seedLocalCollection();
      await service.run(_alice);
      await service.run(_bob);

      await service.run(_alice);

      expect(binder.load().single.card.id, 'a');
      expect(lend.load().single.personName, 'Sam');
      expect(trades.load().single.id, 't1');
    });

    test(
      'reports binder/lend/trades changed when discard empties into empty remote',
      () async {
        // Account A synced; disk holds their collection. Account B has nothing
        // in the cloud — the merge is a no-op, but the discard still emptied
        // local caches and must surface as a change so screens invalidate.
        await seedLocalCollection();
        await service.run(_alice);
        expect(binder.load(), isNotEmpty);
        expect(lend.load(), isNotEmpty);
        expect(trades.load(), isNotEmpty);

        final outcome = await service.run(_bob);

        expect(outcome.binderChanged, isTrue);
        expect(outcome.bindersChanged, isTrue);
        expect(outcome.lendChanged, isTrue);
        expect(outcome.tradesChanged, isTrue);
        expect(
          outcome.settingsChanged,
          isFalse,
          reason: 'settings survive an account switch; discard must not '
              'force a settings refresh',
        );
        expect(binder.load(), isEmpty);
        expect(
          binders.load().where((b) => b.isLive).map((b) => b.clientId),
          containsAll([BinderIds.trade, BinderIds.collection]),
        );
        expect(lend.load(), isEmpty);
        expect(trades.load(), isEmpty);
      },
    );

    test(
      'binder notifier no longer exposes previous account after switch',
      () async {
        await seedLocalCollection();
        await service.run(_alice);

        final prefs = await SharedPreferences.getInstance();
        final container = ProviderContainer(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
            accountProvider.overrideWith((ref) => Stream.value(null)),
            syncServiceProvider.overrideWithValue(service),
          ],
        );
        addTearDown(container.dispose);

        // Holds Alice's entries in memory the way a live screen would.
        expect(container.read(binderProvider).single.card.id, 'a');
        expect(container.read(lendProvider), isNotEmpty);
        expect(container.read(tradeHistoryProvider), isNotEmpty);

        await container.read(syncProvider.notifier).sync(_bob);

        expect(container.read(binderProvider), isEmpty);
        expect(container.read(lendProvider), isEmpty);
        expect(container.read(tradeHistoryProvider), isEmpty);
      },
    );
  });

  group('partial failure', () {
    test('one unreachable table does not strand the others', () async {
      await seedLocalCollection();
      binderTable.failOnRead = true;

      final outcome = await service.run(_alice);

      expect(outcome.binderChanged, isFalse);
      expect(lendTable.rows, hasLength(1));
      expect(tradesTable.rows, hasLength(1));
    });

    test('local data survives an unreachable table', () async {
      await seedLocalCollection();
      binderTable.failOnRead = true;

      await service.run(_alice);

      expect(binder.load().single.card.id, 'a');
    });

    test('throws when nothing at all could be reached', () async {
      await seedLocalCollection();
      binderTable.failOnRead = true;
      bindersTable.failOnRead = true;
      lendTable.failOnRead = true;
      tradesTable.failOnRead = true;
      settingsRow.failOnRead = true;

      await expectLater(service.run(_alice), throwsA(isA<Exception>()));
    });
  });

  test('first-run empty local keeps remote extras instead of journaling deletes',
      () async {
    bindersTable.rows[BinderIds.trade] = {
      'user_id': _alice,
      'client_id': BinderIds.trade,
      'name': 'Trade Binder',
      'role': 'trade',
      'created_at': DateTime.utc(2026, 1, 1).toIso8601String(),
      'updated_at': DateTime.utc(2026, 1, 1).toIso8601String(),
      'deleted_at': null,
    };
    bindersTable.rows['extra'] = {
      'user_id': _alice,
      'client_id': 'extra',
      'name': 'Side Event',
      'role': 'standard',
      'created_at': DateTime.utc(2026, 1, 2).toIso8601String(),
      'updated_at': DateTime.utc(2026, 1, 2).toIso8601String(),
      'deleted_at': null,
    };

    await service.run(_alice);

    expect(
      binders.load().any((b) => b.clientId == 'extra' && b.isLive),
      isTrue,
    );
    expect(bindersTable.rows['extra']!['deleted_at'], isNull);
  });

  test('reports which collections changed, and nothing more', () async {
    await seedLocalCollection();
    await service.run(_alice);

    final outcome = await service.run(_alice);

    expect(outcome.anyChanged, isFalse);
  });
}
