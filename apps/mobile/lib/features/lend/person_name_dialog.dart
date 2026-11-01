import 'package:flutter/material.dart';

import '../../app/text_field_clear_button.dart';

/// Prompts for an optional person name. Returns the entered string (possibly
/// empty for "no name"), or null if the dialog was cancelled/dismissed.
Future<String?> askPersonName(
  BuildContext context, {
  required bool isBorrowing,
  String? initial,
}) {
  final controller = TextEditingController(text: initial ?? '');
  return showAdaptiveDialog<String>(
    context: context,
    builder: (context) => AlertDialog.adaptive(
      title: Text(isBorrowing ? 'Borrowing from' : 'Lent to'),
      content: ListenableBuilder(
        listenable: controller,
        builder: (context, _) => TextField(
          controller: controller,
          autofocus: true,
          textCapitalization: TextCapitalization.words,
          decoration: InputDecoration(
            labelText: 'Name (optional)',
            hintText: 'e.g. Alex',
            suffixIcon: TextFieldClearButton.maybe(
              text: controller.text,
              onPressed: controller.clear,
            ),
          ),
          onSubmitted: (v) => Navigator.of(context).pop(v.trim()),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(controller.text.trim()),
          child: const Text('Save'),
        ),
      ],
    ),
  );
}
