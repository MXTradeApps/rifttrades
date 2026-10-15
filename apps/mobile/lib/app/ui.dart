import 'package:flutter/material.dart';

import 'theme.dart';

/// Shared building blocks for the redesigned screens. They mirror the web
/// app's layout primitives (apps/web/src/components/layout/Page.jsx and
/// components/ui/FoilTag.jsx) so the two clients read as one product: quiet
/// neutral surfaces, hairline borders, one accent, tabular price figures.

/// Large page title with optional subtitle and trailing actions. Used at the
/// top of scrollable tab roots, the way the web's PageHeader opens a page.
class PageHeader extends StatelessWidget {
  const PageHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.trailing,
    this.padding = const EdgeInsets.fromLTRB(16, 12, 16, 12),
  });

  final String title;
  final String? subtitle;
  final Widget? trailing;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: padding,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.4,
                    height: 1.15,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    subtitle!,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (trailing != null) ...[const SizedBox(width: 12), trailing!],
        ],
      ),
    );
  }
}

/// Small heading that labels a group of content, with an optional count pill
/// and trailing widget (e.g. a "See all" button).
class SectionTitle extends StatelessWidget {
  const SectionTitle(
    this.label, {
    super.key,
    this.icon,
    this.count,
    this.trailing,
    this.padding = const EdgeInsets.fromLTRB(16, 20, 16, 8),
  });

  final String label;
  final IconData? icon;
  final int? count;
  final Widget? trailing;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Padding(
      padding: padding,
      child: Row(
        children: [
          if (icon != null) ...[
            Icon(icon, size: 18, color: scheme.onSurfaceVariant),
            const SizedBox(width: 8),
          ],
          Expanded(
            child: Row(
              children: [
                Flexible(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.1,
                    ),
                  ),
                ),
                if (count != null) ...[
                  const SizedBox(width: 8),
                  CountPill(count: count!),
                ],
              ],
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}

/// Uppercase eyebrow label for grouping list sections (settings, set tiers).
class Eyebrow extends StatelessWidget {
  const Eyebrow(
    this.label, {
    super.key,
    this.padding = const EdgeInsets.fromLTRB(16, 20, 16, 8),
  });

  final String label;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: padding,
      child: Text(
        label.toUpperCase(),
        style: theme.textTheme.labelSmall?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.9,
        ),
      ),
    );
  }
}

/// Rounded neutral count bubble, e.g. beside a section title.
class CountPill extends StatelessWidget {
  const CountPill({super.key, required this.count});
  final int count;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 1),
      decoration: BoxDecoration(
        color: context.tokens.hover,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$count',
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: scheme.onSurfaceVariant,
          fontFeatures: AppType.tabularFigures,
        ),
      ),
    );
  }
}

/// Rounded surface for grouping content: hairline border plus a soft shadow.
/// Lists and grids usually read better without one, so use sparingly.
class Panel extends StatelessWidget {
  const Panel({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.onTap,
    this.color,
    this.radius = 14,
  });

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final Color? color;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(radius),
      side: BorderSide(color: t.border),
    );
    Widget content =
        padding == null ? child : Padding(padding: padding!, child: child);
    if (onTap != null) {
      content = InkWell(onTap: onTap, customBorder: shape, child: content);
    }
    return Container(
      margin: margin,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        boxShadow: t.shadowSm,
      ),
      child: Material(
        color: color ?? t.surface,
        shape: shape,
        clipBehavior: Clip.antiAlias,
        child: content,
      ),
    );
  }
}

/// Centered empty / sign-in / error state: an icon tile, a title, a line of
/// explanation and optional actions.
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    this.icon,
    required this.title,
    this.message,
    this.actions = const [],
    this.padding = const EdgeInsets.symmetric(horizontal: 32, vertical: 40),
  });

  final IconData? icon;
  final String title;
  final String? message;
  final List<Widget> actions;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Padding(
      padding: padding,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: context.tokens.accentSoft,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, size: 28, color: scheme.primary),
            ),
            const SizedBox(height: 16),
          ],
          Text(
            title,
            textAlign: TextAlign.center,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: -0.2,
            ),
          ),
          if (message != null) ...[
            const SizedBox(height: 6),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 320),
              child: Text(
                message!,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: scheme.onSurfaceVariant,
                  height: 1.4,
                ),
              ),
            ),
          ],
          if (actions.isNotEmpty) ...[
            const SizedBox(height: 20),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: actions,
            ),
          ],
        ],
      ),
    );
  }
}

/// Colour-coded finish label ("Foil", "Pack Foil", "Promo"), matching the
/// web's FoilTag swatches. Pass [label] for compact text.
class FoilTag extends StatelessWidget {
  const FoilTag({super.key, required this.subTypeName, required this.label});

  final String? subTypeName;
  final String label;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final style = foilSwatch(subTypeName, isDark);
    return Container(
      padding: const EdgeInsets.fromLTRB(6, 3, 6, 3),
      decoration: BoxDecoration(
        color: style.gradient == null ? style.background : null,
        gradient: style.gradient,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        maxLines: 1,
        style: TextStyle(
          fontSize: 10.5,
          height: 1,
          fontWeight: FontWeight.w700,
          color: style.foreground,
        ),
      ),
    );
  }
}

/// Swatch for a Riftbound finish. Mirrors apps/web/src/utils/foilStyle.js:
/// pack foil, promo / Nexus Night and plain foil each get their own swatch.
({Color background, Color foreground, Gradient? gradient}) foilSwatch(
  String? subTypeName,
  bool isDark,
) {
  final sub = (subTypeName ?? '').toLowerCase();
  if (sub.contains('pack foil')) {
    return (
      background: isDark ? const Color(0x29E5C078) : const Color(0xFFFBF0D2),
      foreground: isDark ? const Color(0xFFF0D498) : const Color(0xFF6B4C00),
      gradient: null,
    );
  }
  if (sub.contains('nexus night') || sub.contains('promo')) {
    return (
      background: isDark ? const Color(0x29A88CFF) : const Color(0xFFEEE8FB),
      foreground: isDark ? const Color(0xFFC9B8FF) : const Color(0xFF4A2E8A),
      gradient: null,
    );
  }
  if (sub.contains('foil') || sub.contains('holo')) {
    return (
      background: Colors.transparent,
      foreground: isDark ? const Color(0xFFE8F1F5) : AppTheme.tealDeep,
      gradient: LinearGradient(
        colors: isDark
            ? const [Color(0x385ABADA), Color(0x38E5C078)]
            : const [Color(0xFFDCEFF6), Color(0xFFF8EED6)],
      ),
    );
  }
  return (
    background: isDark ? AppTokens.dark.hover : AppTokens.light.hover,
    foreground: isDark ? const Color(0xFFA0B6C3) : const Color(0xFF4E6272),
    gradient: null,
  );
}

/// Two-part bar showing how a trade's value splits between what you give
/// (accent) and what you get (gain green). Mirrors the web BalanceBar.
class BalanceBar extends StatelessWidget {
  const BalanceBar({
    super.key,
    required this.give,
    required this.get,
    this.height = 6,
  });

  final double give;
  final double get;
  final double height;

  @override
  Widget build(BuildContext context) {
    final total = give + get;
    final giveFrac = total > 0 ? (give / total).clamp(0.0, 1.0) : 0.5;
    final empty = context.tokens.hover;
    return Semantics(
      label: total > 0
          ? 'You give ${(giveFrac * 100).round()}% of the trade value'
          : 'No cards in the trade yet',
      child: SizedBox(
        height: height,
        child: LayoutBuilder(
          builder: (context, c) {
            const gap = 3.0;
            final usable = (c.maxWidth - gap).clamp(0.0, double.infinity);
            final giveW = (usable * giveFrac).clamp(height / 2, usable - height / 2);
            return Row(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 240),
                  curve: Curves.easeOut,
                  width: giveW,
                  decoration: BoxDecoration(
                    color: total > 0 ? context.tokens.accent : empty,
                    borderRadius: BorderRadius.circular(height),
                  ),
                ),
                const SizedBox(width: gap),
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: total > 0 ? context.tokens.gain : empty,
                      borderRadius: BorderRadius.circular(height),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

/// Small dot used beside a label to key it to a color (give / get, live).
class ToneDot extends StatelessWidget {
  const ToneDot({super.key, required this.color, this.size = 7});
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}
