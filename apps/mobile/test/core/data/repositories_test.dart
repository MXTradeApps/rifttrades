import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/data/catalog_repository.dart';
import 'package:rifttrades/core/data/binder_repository.dart';
import 'package:rifttrades/core/data/lend_repository.dart';
import 'package:rifttrades/core/data/settings_repository.dart';
import 'package:rifttrades/core/data/trade_repository.dart';
import 'package:rifttrades/core/models/app_settings.dart';
import 'package:rifttrades/core/models/binder_entry.dart';
import 'package:rifttrades/core/models/lend_group.dart';
import 'package:rifttrades/core/models/trade.dart';
import 'package:rifttrades/core/sync/sync_journal.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../support/fixtures.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<SharedPreferences> freshPrefs([Map<String, Object> seed = const {}]) {
    SharedPreferences.setMockInitialValues(seed);
    return SharedPreferences.getInstance();
  }

  Future<BinderRepository> binderRepo([Map<String, Object> seed = const {}]) async {
    final prefs = await freshPrefs(seed);
    return BinderRepository(prefs, SyncJournal(prefs));
  }

  Future<TradeRepository> tradeRepo([Map<String, Object> seed = const {}]) async {
    final prefs = await freshPrefs(seed);
    return TradeRepository(prefs, SyncJournal(prefs));
  }

  Future<LendRepository> lendRepo([Map<String, Object> seed = const {}]) async {
    final prefs = await freshPrefs(seed);
    return LendRepository(prefs, SyncJournal(prefs));
  }

  Future<SettingsRepository> settingsRepo(
      [Map<String, Object> seed = const {}]) async {
    final prefs = await freshPrefs(seed);
    return SettingsRepository(prefs, SyncJournal(prefs));
  }

  group('BinderRepository', () {
    test('returns empty when nothing stored', () async {
      expect((await binderRepo()).load(), isEmpty);
    });

    test('save then load round-trips entries', () async {
      final repo = await binderRepo();
      final entries = [
        BinderEntry(
          card: buildCard(id: 'c1', name: 'Vex'),
          quantity: 2,
          condition: 'LP',
          isWanted: true,
          addedAt: DateTime.utc(2026, 1, 1),
        ),
      ];
      await repo.save(entries);

      final loaded = repo.load();
      expect(loaded.single.card.id, 'c1');
      expect(loaded.single.quantity, 2);
      expect(loaded.single.condition, 'LP');
      expect(loaded.single.isWanted, isTrue);
    });

    test('returns empty on corrupt json', () async {
      final repo = await binderRepo({'collection_entries': 'not json'});
      expect(repo.load(), isEmpty);
    });

    test('persists under legacy collection_entries key', () async {
      final prefs = await freshPrefs();
      final repo = BinderRepository(prefs, SyncJournal(prefs));
      await repo.save([
        BinderEntry(
          card: buildCard(id: 'legacy'),
          quantity: 1,
          addedAt: DateTime.utc(2026, 1, 1),
        ),
      ]);
      expect(prefs.containsKey('collection_entries'), isTrue);
      expect(prefs.containsKey('binder_entries'), isFalse);
    });
  });

  group('TradeRepository', () {
    test('save then load round-trips trades', () async {
      final repo = await tradeRepo();
      final trade = Trade(
        id: 't1',
        createdAt: DateTime.utc(2026, 2, 2),
        haveItems: [
          TradeItem(card: buildCard(id: 'h'), quantity: 1, priceEach: 3),
        ],
      );
      await repo.save([trade]);

      final loaded = repo.load();
      expect(loaded.single.id, 't1');
      expect(loaded.single.haveItems.single.card.id, 'h');
    });

    test('returns empty on corrupt json', () async {
      final repo = await tradeRepo({'saved_trades': '{bad}'});
      expect(repo.load(), isEmpty);
    });
  });

  group('LendRepository', () {
    test('save then load round-trips groups', () async {
      final repo = await lendRepo();
      final group = LendGroup(
        id: 'g1',
        personName: 'Sam',
        createdAt: DateTime.utc(2026, 3, 3),
        items: [LendItem(card: buildCard(id: 'x'), quantity: 2)],
      );
      await repo.save([group]);

      final loaded = repo.load();
      expect(loaded.single.id, 'g1');
      expect(loaded.single.personName, 'Sam');
      expect(loaded.single.cardCount, 2);
    });

    test('returns empty on corrupt json', () async {
      final repo = await lendRepo({'lend_groups': 'x'});
      expect(repo.load(), isEmpty);
    });
  });

  group('SettingsRepository', () {
    test('defaults when nothing stored', () async {
      final repo = await settingsRepo();
      final s = repo.load();
      expect(s.source, PriceSource.tcgplayer);
      expect(s.themeMode, AppThemeMode.dark);
    });

    test('save then load round-trips settings', () async {
      final repo = await settingsRepo();
      await repo.save(const AppSettings(
        source: PriceSource.cardmarket,
        themeMode: AppThemeMode.light,
      ));
      final s = repo.load();
      expect(s.source, PriceSource.cardmarket);
      expect(s.themeMode, AppThemeMode.light);
    });

    test('defaults on corrupt json', () async {
      final repo = await settingsRepo({'app_settings': 'nope'});
      expect(repo.load().source, PriceSource.tcgplayer);
    });
  });

  group('CatalogRepository', () {
    test('load returns null when empty', () async {
      final repo = CatalogRepository(await freshPrefs());
      expect(repo.load(), isNull);
      expect(repo.lastUpdated(), isNull);
    });

    test('save then load round-trips the catalog and stamps updated time',
        () async {
      final repo = CatalogRepository(await freshPrefs());
      await repo.save([buildCard(id: 'a'), buildCard(id: 'b')]);

      final loaded = repo.load();
      expect(loaded, isNotNull);
      expect(loaded!.map((c) => c.id), ['a', 'b']);
      expect(repo.lastUpdated(), isA<DateTime>());
    });

    test('load returns null on corrupt json', () async {
      final repo = CatalogRepository(await freshPrefs({'card_catalog': '!!'}));
      expect(repo.load(), isNull);
    });
  });
}
