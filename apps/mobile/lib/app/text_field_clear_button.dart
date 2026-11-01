import 'package:flutter/material.dart';

/// Trailing clear (x) for [TextField]s. Hidden when the field is empty so the
/// suffix slot does not reserve space.
class TextFieldClearButton extends StatelessWidget {
  const TextFieldClearButton({
    super.key,
    required this.onPressed,
    this.tooltip = 'Clear',
    this.iconSize,
    this.compact = false,
  });

  final VoidCallback onPressed;
  final String tooltip;
  final double? iconSize;
  final bool compact;

  /// Returns null when [text] is empty so [InputDecoration.suffixIcon] collapses.
  static Widget? maybe({
    Key? key,
    required String text,
    required VoidCallback onPressed,
    String tooltip = 'Clear',
    double? iconSize,
    bool compact = false,
  }) {
    if (text.isEmpty) return null;
    return TextFieldClearButton(
      key: key,
      onPressed: onPressed,
      tooltip: tooltip,
      iconSize: iconSize,
      compact: compact,
    );
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: Icon(Icons.clear, size: iconSize),
      tooltip: tooltip,
      onPressed: onPressed,
      visualDensity: compact ? VisualDensity.compact : null,
    );
  }
}
