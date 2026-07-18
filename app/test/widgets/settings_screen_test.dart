import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rifttrades/core/models/app_settings.dart';
import 'package:rifttrades/core/providers.dart';
import 'package:rifttrades/features/settings/settings_screen.dart';

import '../support/harness.dart';

void main() {
  testWidgets('renders price source and appearance sections', (tester) async {
    await pumpApp(tester, const SettingsScreen());
    expect(find.text('Settings'), findsOneWidget);
    expect(find.text('PRICE SOURCE'), findsOneWidget);
    expect(find.text('APPEARANCE'), findsOneWidget);
    expect(find.text('Dark mode'), findsOneWidget);
  });

  testWidgets('selecting CardMarket updates settings state', (tester) async {
    final container = await pumpApp(tester, const SettingsScreen());
    expect(container.read(settingsProvider).source, PriceSource.tcgplayer);

    await tester.tap(find.text('CardMarket'));
    await tester.pumpAndSettle();

    expect(container.read(settingsProvider).source, PriceSource.cardmarket);
  });

  testWidgets('toggling dark mode updates theme preference', (tester) async {
    final container = await pumpApp(tester, const SettingsScreen());
    expect(container.read(settingsProvider).themeMode, AppThemeMode.dark);

    await tester.tap(find.byType(SwitchListTile).first);
    await tester.pumpAndSettle();

    expect(container.read(settingsProvider).themeMode, AppThemeMode.light);
  });
}
