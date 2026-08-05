import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';

/// Queues a rate-limited sync after a local binder / want-list write.
///
/// No-op when signed out — the local cache is already the source of truth.
void queueSyncAfterBinderChange(WidgetRef ref) {
  final account = ref.read(accountProvider).asData?.value;
  if (account == null) return;
  ref.read(syncProvider.notifier).requestSyncAfterLocalChange(account.id);
}

/// Pull-to-refresh entry point for binder / want list.
///
/// No-op when signed out. Rate-limited inside [SyncNotifier].
Future<void> pullToRefreshAccountSync(WidgetRef ref) async {
  final account = ref.read(accountProvider).asData?.value;
  if (account == null) return;
  await ref.read(syncProvider.notifier).requestSyncFromUserRefresh(account.id);
}
