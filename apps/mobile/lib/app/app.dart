import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:showcaseview/showcaseview.dart';

import '../core/models/app_settings.dart';
import '../core/providers.dart';
import '../core/update/app_update_dialog.dart';
import '../features/binder/binder_screen.dart';
import '../features/card_detail/card_detail_screen.dart';
import '../features/lend/lend_screen.dart';
import '../features/onboarding/onboarding_keys.dart';
import '../features/onboarding/onboarding_provider.dart';
import '../features/onboarding/onboarding_repository.dart';
import '../features/onboarding/showcase_theme.dart';
import '../features/onboarding/tour_controller.dart';
import '../features/onboarding/welcome_carousel.dart';
import '../features/price_alerts/price_alerts_screen.dart';
import '../features/price_alerts/push_host.dart';
import '../features/search/search_screen.dart';
import '../features/sync/sync_host.dart';
import '../features/trade/trade_screen.dart';
import 'more_sheet.dart';
import 'theme.dart';

class RiftTradesApp extends ConsumerWidget {
  const RiftTradesApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    return MaterialApp(
      title: 'RiftTrades',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: settings.themeMode == AppThemeMode.dark
          ? ThemeMode.dark
          : ThemeMode.light,
      home: const SyncHost(child: PushHost(child: _OnboardingGate())),
    );
  }
}

/// Shows the welcome carousel once, then the main tab shell.
class _OnboardingGate extends ConsumerWidget {
  const _OnboardingGate();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final seen = ref.watch(onboardingProvider);
    if (!seen.contains(OnboardingTourId.welcome)) {
      return WelcomeCarousel(
        onFinished: () {
          // Provider update rebuilds this gate into HomeShell.
        },
      );
    }
    return const HomeShell();
  }
}

class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;
  late final TourController _tours;
  int? _activeTourTab;

  // Scan is reached from Browse / Trade / Binder (not a bottom-nav tab).
  static const _screens = [
    BrowseScreen(),
    BinderScreen(),
    TradeScreen(),
    LendScreen(),
  ];

  /// The fifth destination is not a tab: it opens the More sheet.
  static const _moreIndex = 4;

  @override
  void initState() {
    super.initState();
    _tours = TourController(ref);
    ShowcaseView.register(
      scope: OnboardingKeys.homeScope,
      disableMovingAnimation: true,
      enableAutoScroll: true,
      skipIfTargetNotPresent: true,
      globalTooltipActionConfig: ShowcaseTheme.actionConfig,
      globalTooltipActions: ShowcaseTheme.homeActions,
      onFinish: _onTourFinished,
      onDismiss: (_) => _onTourFinished(),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ref.read(homeTabIndexProvider.notifier).setIndex(_index);
        _checkForAppUpdate();
        _maybeStartTourForTab(_index);
      }
    });
  }

  @override
  void dispose() {
    ShowcaseView.getNamed(OnboardingKeys.homeScope).unregister();
    super.dispose();
  }

  Future<void> _checkForAppUpdate() async {
    try {
      final checker = ref.read(appUpdateCheckerProvider);
      final prompt = await checker.check();
      if (!mounted || prompt == null) return;
      await showAppUpdateDialog(
        context,
        prompt: prompt,
        onLater: checker.dismiss,
      );
    } catch (_) {
      // Offline / tests / PackageInfo unavailable — skip quietly.
    }
  }

  void _onTourFinished() {
    final tab = _activeTourTab;
    _activeTourTab = null;
    if (tab == tradeTabIndex) _tours.cleanupTradeSeed();
    if (tab == null) return;
    final id = switch (tab) {
      tradeTabIndex => OnboardingTourId.trade,
      binderTabIndex => OnboardingTourId.binder,
      lendTabIndex => OnboardingTourId.lend,
      _ => null,
    };
    if (id != null) _tours.markSeen(id);
  }

  void _selectTab(int i) {
    if (i == _moreIndex) {
      HapticFeedback.selectionClick();
      showMoreSheet(context);
      return;
    }
    if (i == _index) return;
    // Cancel any in-progress tour before leaving the tab — IndexedStack keeps
    // every Showcase mounted, so a mid-tour switch would highlight the wrong
    // screen. dismiss() invokes onDismiss → _onTourFinished synchronously,
    // which marks the tour seen and clears any seeded trade draft.
    if (_activeTourTab != null) {
      _tours.dismissHomeTour();
    }
    HapticFeedback.selectionClick();
    setState(() => _index = i);
    ref.read(homeTabIndexProvider.notifier).setIndex(i);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _maybeStartTourForTab(i);
    });
  }

  void _maybeStartTourForTab(int i) {
    // Browse has no dedicated tour; Scan teaches itself when opened.
    if (i == 0) return;
    final id = switch (i) {
      tradeTabIndex => OnboardingTourId.trade,
      binderTabIndex => OnboardingTourId.binder,
      lendTabIndex => OnboardingTourId.lend,
      _ => null,
    };
    if (id == null || _tours.hasSeen(id)) return;

    final keys = switch (i) {
      tradeTabIndex => _tours.prepareTradeTour(),
      binderTabIndex => _tours.binderKeys(),
      lendTabIndex => _tours.lendKeys(),
      _ => <GlobalKey>[],
    };
    if (keys.isEmpty) {
      _tours.markSeen(id);
      return;
    }
    _activeTourTab = i;
    // Force a rebuild so seeded trade cards / Showcase wrappers are laid out
    // before startShowCase measures them.
    setState(() {});
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _index != i) return;
      _tours.startHomeTour(keys);
    });
  }

  /// Opens a tapped price alert notification: the card when it is in the
  /// catalog, otherwise the alerts list.
  void _openFromPush(String cardId) {
    final card = cardId.isEmpty ? null : ref.read(catalogByIdProvider)[cardId];
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => card == null
            ? const PriceAlertsScreen()
            : CardDetailScreen(card: card),
        settings: RouteSettings(
          name: card == null ? 'Price Alerts' : 'Card Detail',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<int?>(shellTabProvider, (_, next) {
      if (next == null) return;
      ref.read(shellTabProvider.notifier).clear();
      if (next != _index) _selectTab(next);
    });
    ref.listen<String?>(pushOpenProvider, (_, next) {
      if (next == null) return;
      ref.read(pushOpenProvider.notifier).clear();
      _openFromPush(next);
    });
    final draft = ref.watch(tradeDraftProvider);
    final tradeCount = draft.haveCount + draft.wantCount;

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: IndexedStack(index: _index, children: _screens),
      ),
      bottomNavigationBar: DecoratedBox(
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: context.tokens.border)),
        ),
        child: NavigationBar(
          selectedIndex: _index,
          onDestinationSelected: _selectTab,
          destinations: [
            const NavigationDestination(
              icon: Icon(Icons.grid_view_outlined),
              selectedIcon: Icon(Icons.grid_view),
              label: 'Browse',
            ),
            const NavigationDestination(
              icon: Icon(Icons.collections_bookmark_outlined),
              selectedIcon: Icon(Icons.collections_bookmark),
              label: 'Binder',
            ),
            NavigationDestination(
              icon: Badge(
                isLabelVisible: tradeCount > 0,
                label: Text('$tradeCount'),
                child: const Icon(Icons.swap_horiz_rounded),
              ),
              selectedIcon: Badge(
                isLabelVisible: tradeCount > 0,
                label: Text('$tradeCount'),
                child: const Icon(Icons.swap_horiz_rounded),
              ),
              label: 'Trade',
            ),
            const NavigationDestination(
              icon: Icon(Icons.sync_alt_rounded),
              selectedIcon: Icon(Icons.sync_alt_rounded),
              label: 'Lend',
            ),
            const NavigationDestination(
              icon: Icon(Icons.more_horiz_rounded),
              label: 'More',
            ),
          ],
        ),
      ),
    );
  }
}
