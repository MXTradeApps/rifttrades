import 'package:fake_async/fake_async.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:rifttrades/core/providers.dart';
import 'package:rifttrades/core/sync/sync_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _CountingSyncService extends Mock implements SyncService {}

void main() {
  late _CountingSyncService service;
  late ProviderContainer container;
  var runs = 0;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    service = _CountingSyncService();
    runs = 0;
    when(() => service.run(any())).thenAnswer((_) async {
      runs++;
      return const SyncOutcome();
    });

    container = ProviderContainer(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        // Signed out so build() does not auto-sync.
        accountProvider.overrideWith((ref) => Stream.value(null)),
        syncServiceProvider.overrideWithValue(service),
      ],
    );
  });

  tearDown(() => container.dispose());

  SyncNotifier notifier() => container.read(syncProvider.notifier);

  group('requestSyncAfterLocalChange', () {
    test('debounces a burst of adds into one sync', () {
      fakeAsync((async) {
        final sync = notifier();
        sync.requestSyncAfterLocalChange('user-1');
        sync.requestSyncAfterLocalChange('user-1');
        sync.requestSyncAfterLocalChange('user-1');
        expect(runs, 0);

        async.elapse(SyncNotifier.localChangeDebounce);
        async.flushMicrotasks();

        expect(runs, 1);
      });
    });

    test('enforces a minimum interval between add-triggered syncs', () {
      fakeAsync((async) {
        final sync = notifier();

        sync.requestSyncAfterLocalChange('user-1');
        async.elapse(SyncNotifier.localChangeDebounce);
        async.flushMicrotasks();
        expect(runs, 1);

        sync.requestSyncAfterLocalChange('user-1');
        async.elapse(SyncNotifier.localChangeDebounce);
        async.flushMicrotasks();
        // Still inside the floor — the flush reschedules rather than running.
        expect(runs, 1);

        async.elapse(SyncNotifier.localChangeMinInterval);
        async.flushMicrotasks();
        expect(runs, 2);
      });
    });
  });

  group('requestSyncFromUserRefresh', () {
    test('runs immediately on the first pull', () {
      fakeAsync((async) {
        final sync = notifier();
        sync.requestSyncFromUserRefresh('user-1');
        async.flushMicrotasks();
        expect(runs, 1);
      });
    });

    test('rate-limits repeated pull-to-refresh', () {
      fakeAsync((async) {
        final sync = notifier();

        sync.requestSyncFromUserRefresh('user-1');
        async.flushMicrotasks();
        expect(runs, 1);

        sync.requestSyncFromUserRefresh('user-1');
        async.flushMicrotasks();
        expect(runs, 1);

        async.elapse(SyncNotifier.userRefreshMinInterval);
        sync.requestSyncFromUserRefresh('user-1');
        async.flushMicrotasks();
        expect(runs, 2);
      });
    });
  });

  test('unrestricted sync is not blocked by the refresh floor', () {
    fakeAsync((async) {
      final sync = notifier();

      sync.requestSyncFromUserRefresh('user-1');
      async.flushMicrotasks();
      expect(runs, 1);

      sync.sync('user-1');
      async.flushMicrotasks();
      expect(runs, 2);
    });
  });
}
