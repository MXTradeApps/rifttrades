import '../models/binder.dart';
import '../sync/binders_sync.dart';
import 'cached_collection.dart';

class BindersRepository extends CachedCollection<Binder> {
  BindersRepository(super.prefs, super.journal);

  List<Binder>? _firstRunSeed;

  @override
  String get storageKey => 'binders';

  @override
  BindersSyncAdapter get adapter => const BindersSyncAdapter();

  @override
  Map<String, dynamic> encode(Binder value) => value.toJson();

  @override
  Binder decode(Map<String, dynamic> json) => Binder.fromJson(json);

  /// Sync reads: missing key is empty so first pull is not raced by invented
  /// seeds. UI uses [loadForDisplay] for the in-memory first-run pair.
  @override
  List<Binder> load() {
    if (!hasStorageKey) return [];
    _firstRunSeed = null;
    return super.load();
  }

  /// First run (no storage key) shows Trade Binder + Collection in memory.
  /// Not persisted — that happens after the first pull or the first local write.
  List<Binder> loadForDisplay() {
    if (!hasStorageKey) {
      return _firstRunSeed ??= Binder.seedDefaults();
    }
    _firstRunSeed = null;
    return super.load();
  }

  /// Local edits never leave Trade Binder missing or tombstoned.
  @override
  Future<void> save(List<Binder> values) =>
      super.save(Binder.ensureTrade(values));
}
