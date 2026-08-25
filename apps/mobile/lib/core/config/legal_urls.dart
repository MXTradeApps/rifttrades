/// Public legal URLs used by in-app Settings links, StoreKit policy buttons,
/// and App Store / Play listing metadata.
///
/// Hosted on the production site (riftrades.com) so store reviewers always hit
/// a live page. `/privacy` and `/terms` are routes on the web app.
abstract final class LegalUrls {
  static const privacyPolicy = 'https://riftrades.com/privacy';
  static const termsOfUse = 'https://riftrades.com/terms';
}
