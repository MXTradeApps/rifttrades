import 'package:flutter/material.dart';

import '../core/data/card_repository.dart';
import '../core/models/card_model.dart';
import 'widgets.dart';

typedef PricingLabel = String Function(CardModel card);

/// Distinguishing label for a printing in a version picker.
///
/// Finish alone ("Foil") is not enough — alternate arts, overnumbered /
/// signature variants, and cross-set reprints all share the same finish. This
/// builds a label from the parts that actually differ between printings:
/// name qualifier, set, rarity, collector number, then finish.
String printingLabel(CardModel card) {
  final parts = <String>[];
  final qualifier = nameQualifier(card.name);
  if (qualifier != null && qualifier.isNotEmpty) parts.add(qualifier);
  final setName = card.setName?.trim();
  if (setName != null && setName.isNotEmpty) parts.add(setName);
  final rarity = card.rarity?.trim();
  if (rarity != null && rarity.isNotEmpty && rarity != 'None') {
    parts.add(rarity);
  }
  final number = card.collectorNumber?.trim();
  if (number != null && number.isNotEmpty) parts.add('#$number');
  parts.add(card.finishLabel);
  return parts.join(' · ');
}

/// Bottom sheet to pick among available printings/versions of a card
/// (finishes, alt arts, …). Returns the chosen printing, or
/// null if dismissed without a change.
Future<CardModel?> showPrintingPicker({
  required BuildContext context,
  required CardModel current,
  required List<CardModel> printings,
  String title = 'Version',
  PricingLabel? priceLabel,
}) {
  return showModalBottomSheet<CardModel>(
    context: context,
    showDragHandle: true,
    isScrollControlled: true,
    builder: (ctx) {
      final theme = Theme.of(ctx);
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CardThumbnail(
                      url: current.imageUrl,
                      foil: current.isFoil,
                      width: 40,
                      height: 56),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(current.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.titleMedium
                                ?.copyWith(fontWeight: FontWeight.w700)),
                        CardMetaLine(card: current),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(title, style: theme.textTheme.titleSmall),
              if (printings.length < 2)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    'No alternate versions for this card',
                    style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant),
                  ),
                )
              else
                ConstrainedBox(
                  constraints: BoxConstraints(
                    maxHeight: MediaQuery.sizeOf(ctx).height * 0.5,
                  ),
                  child: ListView(
                    shrinkWrap: true,
                    children: [
                      for (final printing in printings)
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: CardThumbnail(
                            url: printing.imageUrl,
                            foil: printing.isFoil,
                            width: 36,
                            height: 50,
                          ),
                          title: Text(
                            printingLabel(printing),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: priceLabel == null
                              ? null
                              : Text(priceLabel(printing),
                                  style: theme.textTheme.bodySmall),
                          trailing: printing.id == current.id
                              ? Icon(Icons.check_circle,
                                  color: theme.colorScheme.primary)
                              : null,
                          onTap: printing.id == current.id
                              ? null
                              : () => Navigator.pop(ctx, printing),
                        ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      );
    },
  );
}
