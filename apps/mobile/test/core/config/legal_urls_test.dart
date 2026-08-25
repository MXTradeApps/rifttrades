import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/config/legal_urls.dart';

void main() {
  test('store and in-app legal links point at the live riftrades.com pages', () {
    expect(LegalUrls.privacyPolicy, 'https://riftrades.com/privacy');
    expect(LegalUrls.termsOfUse, 'https://riftrades.com/terms');
  });
}
