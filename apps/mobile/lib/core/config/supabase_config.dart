/// Which Supabase project this build talks to.
///
/// There is deliberately no default for the URL or the key. A build that was
/// never told which backend it uses must fail rather than guess, because
/// guessing means a sandbox purchase in a test build writing a real entitlement.
///
/// The publishable key is safe to ship: catalog tables are public read-only
/// under RLS, and per-user rows are scoped to `auth.uid()`.
class SupabaseConfig {
  const SupabaseConfig._();

  static const url = String.fromEnvironment('SUPABASE_URL');
  static const publishableKey =
      String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');

  /// `production` or `staging`. Only used to label non-production builds.
  static const environment =
      String.fromEnvironment('APP_ENV', defaultValue: 'production');

  static bool get isProduction => environment == 'production';

  static void assertConfigured() {
    if (url.isNotEmpty && publishableKey.isNotEmpty) return;
    throw StateError(
      'This build has no Supabase configuration.\n'
      'Pass one at build time, for example:\n'
      '  flutter run --dart-define-from-file=env/production.json\n',
    );
  }
}
