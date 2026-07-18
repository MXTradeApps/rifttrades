/// Remote singleton row from `public.app_config` that drives update prompts.
class AppConfig {
  final String latestVersion;
  final String? minVersion;
  final String? androidStoreUrl;
  final String? iosStoreUrl;
  final String? message;

  const AppConfig({
    required this.latestVersion,
    this.minVersion,
    this.androidStoreUrl,
    this.iosStoreUrl,
    this.message,
  });

  factory AppConfig.fromJson(Map<String, dynamic> json) => AppConfig(
        latestVersion: json['latest_version'] as String,
        minVersion: json['min_version'] as String?,
        androidStoreUrl: json['android_store_url'] as String?,
        iosStoreUrl: json['ios_store_url'] as String?,
        message: json['message'] as String?,
      );

  /// Store URL for the current platform (no cross-store fallback).
  String? storeUrl({required bool isIOS}) =>
      isIOS ? iosStoreUrl : androidStoreUrl;
}
