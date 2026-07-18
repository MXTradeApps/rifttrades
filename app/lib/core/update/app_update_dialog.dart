import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'app_update_checker.dart';

/// Shows the update prompt. Returns after the dialog is dismissed (or never,
/// when [prompt.forced] and the user has no way to dismiss).
Future<void> showAppUpdateDialog(
  BuildContext context, {
  required AppUpdatePrompt prompt,
  required Future<void> Function(String latestVersion) onLater,
  Future<bool> Function(Uri url)? launchUrlFn,
}) async {
  final launch = launchUrlFn ??
      ((uri) => launchUrl(uri, mode: LaunchMode.externalApplication));

  await showAdaptiveDialog<void>(
    context: context,
    barrierDismissible: !prompt.forced,
    builder: (ctx) => AlertDialog.adaptive(
      title: Text(prompt.forced ? 'Update required' : 'Update available'),
      content: Text(prompt.message),
      actions: [
        if (!prompt.forced)
          TextButton(
            onPressed: () async {
              await onLater(prompt.latestVersion);
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Later'),
          ),
        if (prompt.storeUrl != null)
          FilledButton(
            onPressed: () async {
              final uri = Uri.tryParse(prompt.storeUrl!);
              if (uri != null) await launch(uri);
              if (!prompt.forced && ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Update'),
          ),
      ],
    ),
  );
}
