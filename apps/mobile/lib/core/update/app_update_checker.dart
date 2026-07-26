import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../data/app_config_repository.dart';
import '../logic/app_version.dart';
import '../models/app_config.dart';

/// Result of an update check that should be shown to the user.
class AppUpdatePrompt {
  final String latestVersion;
  final String message;
  final String? storeUrl;
  final bool forced;

  const AppUpdatePrompt({
    required this.latestVersion,
    required this.message,
    required this.storeUrl,
    required this.forced,
  });
}

/// Deep module: given installed version + remote config + dismiss state,
/// decides whether to surface an update prompt.
class AppUpdateDecision {
  const AppUpdateDecision._();

  static AppUpdatePrompt? evaluate({
    required String installedVersion,
    required AppConfig config,
    required String? dismissedForVersion,
    required bool isIOS,
  }) {
    final forced = config.minVersion != null &&
        isVersionOlder(installedVersion, config.minVersion!);
    final outdated = isVersionOlder(installedVersion, config.latestVersion);

    if (!outdated && !forced) return null;

    if (!forced && dismissedForVersion == config.latestVersion) {
      return null;
    }

    final message = (config.message != null && config.message!.trim().isNotEmpty)
        ? config.message!.trim()
        : 'A newer version of RiftTrades is available.';

    return AppUpdatePrompt(
      latestVersion: config.latestVersion,
      message: message,
      storeUrl: config.storeUrl(isIOS: isIOS),
      forced: forced,
    );
  }
}

/// Coordinates PackageInfo + Supabase `app_config` + SharedPreferences dismiss
/// state into a single [check] call for the launch UI.
class AppUpdateChecker {
  AppUpdateChecker({
    required this.prefs,
    required this.client,
    Future<String> Function()? readInstalledVersion,
    bool Function()? isIOS,
  })  : _readInstalledVersion =
            readInstalledVersion ?? _defaultInstalledVersion,
        _isIOS = isIOS ?? _defaultIsIOS;

  static const dismissedKey = 'dismissed_app_update_version';

  final SharedPreferences prefs;

  /// Lazy so callers (and tests) can construct without initializing Supabase.
  final SupabaseClient Function() client;
  final Future<String> Function() _readInstalledVersion;
  final bool Function() _isIOS;

  Future<AppUpdatePrompt?> check() async {
    final installed = await _readInstalledVersion();
    final config = await AppConfigRepository(client()).fetch();
    if (config == null) return null;

    return AppUpdateDecision.evaluate(
      installedVersion: installed,
      config: config,
      dismissedForVersion: prefs.getString(dismissedKey),
      isIOS: _isIOS(),
    );
  }

  Future<void> dismiss(String latestVersion) =>
      prefs.setString(dismissedKey, latestVersion);

  static Future<String> _defaultInstalledVersion() async =>
      (await PackageInfo.fromPlatform()).version;

  static bool _defaultIsIOS() =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS;
}
