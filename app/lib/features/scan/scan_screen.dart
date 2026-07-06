import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

import '../../app/app.dart';
import '../../app/card_actions.dart';
import '../../app/widgets.dart';
import '../../core/models/card_model.dart';
import '../../core/providers.dart';
import '../card_detail/card_detail_screen.dart';

/// Matches Riftbound collector numbers like "147/219" or "086/219".
final _collectorRegex = RegExp(r'\b(\d{1,3})\s*/\s*(\d{1,3})\b');

class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen>
    with WidgetsBindingObserver {
  CameraController? _controller;
  final _recognizer = TextRecognizer(script: TextRecognitionScript.latin);
  bool _initializing = true;
  bool _cameraAvailable = false;
  bool _busy = false;
  String? _statusMessage;
  List<CardModel> _matches = const [];
  String? _lastNumber;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initCamera();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller?.dispose();
    _recognizer.close();
    super.dispose();
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        setState(() {
          _initializing = false;
          _cameraAvailable = false;
        });
        return;
      }
      final back = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );
      final controller = CameraController(
        back,
        ResolutionPreset.high,
        enableAudio: false,
      );
      await controller.initialize();
      if (!mounted) return;
      setState(() {
        _controller = controller;
        _cameraAvailable = true;
        _initializing = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _initializing = false;
        _cameraAvailable = false;
      });
    }
  }

  Future<void> _capture() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized || _busy) return;
    setState(() {
      _busy = true;
      _statusMessage = 'Reading card…';
    });
    try {
      final file = await controller.takePicture();
      final input = InputImage.fromFilePath(file.path);
      final result = await _recognizer.processImage(input);
      final match = _collectorRegex.firstMatch(result.text);
      if (match == null) {
        setState(() {
          _statusMessage =
              'No collector number found. Fill the frame with the card and try again.';
          _matches = const [];
        });
        return;
      }
      final num1 = match.group(1)!.padLeft(3, '0');
      final num2 = match.group(2)!;
      final collectorNumber = '$num1/$num2';
      await _lookup(collectorNumber);
    } catch (e) {
      setState(() => _statusMessage = 'Scan failed: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _lookup(String collectorNumber) async {
    setState(() {
      _lastNumber = collectorNumber;
      _statusMessage = 'Looking up #$collectorNumber…';
    });
    try {
      final matches = await ref
          .read(cardRepositoryProvider)
          .findByCollectorNumber(collectorNumber);
      setState(() {
        _matches = matches;
        _statusMessage = matches.isEmpty
            ? 'No card found for #$collectorNumber.'
            : 'Found ${matches.length} printing(s) for #$collectorNumber.';
      });
    } catch (e) {
      setState(() => _statusMessage = 'Lookup failed: $e');
    }
  }

  Future<void> _manualEntry() async {
    final controller = TextEditingController(text: _lastNumber ?? '');
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Enter collector number'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'e.g. 147/219',
            prefixText: '#',
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Look up'),
          ),
        ],
      ),
    );
    if (result != null && result.isNotEmpty) {
      final m = _collectorRegex.firstMatch(result);
      final normalized = m != null
          ? '${m.group(1)!.padLeft(3, '0')}/${m.group(2)!}'
          : result;
      await _lookup(normalized);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan'),
        actions: [
          IconButton(
            icon: const Icon(Icons.keyboard),
            tooltip: 'Enter number manually',
            onPressed: _manualEntry,
          ),
          const SettingsAction(),
        ],
      ),
      body: Column(
        children: [
          _buildViewport(),
          if (_statusMessage != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
              child: Text(
                _statusMessage!,
                textAlign: TextAlign.center,
                style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
            ),
          Expanded(child: _buildMatches()),
        ],
      ),
      floatingActionButton: _cameraAvailable
          ? FloatingActionButton.large(
              onPressed: _busy ? null : _capture,
              child: _busy
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Icon(Icons.camera_alt),
            )
          : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }

  Widget _buildViewport() {
    if (_initializing) {
      return const AspectRatio(
        aspectRatio: 3 / 4,
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (!_cameraAvailable || _controller == null) {
      return Container(
        height: 220,
        margin: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.no_photography_outlined,
                size: 40, color: Theme.of(context).colorScheme.outline),
            const SizedBox(height: 12),
            const Text('Camera unavailable'),
            const SizedBox(height: 4),
            Text(
              'Enter a collector number manually instead.',
              style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 12),
            FilledButton.tonalIcon(
              icon: const Icon(Icons.keyboard),
              label: const Text('Enter number'),
              onPressed: _manualEntry,
            ),
          ],
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.all(12),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: AspectRatio(
          aspectRatio: 3 / 4,
          child: Stack(
            fit: StackFit.expand,
            children: [
              CameraPreview(_controller!),
              _ScanOverlay(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMatches() {
    if (_matches.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            _cameraAvailable
                ? 'Point at a card and tap the shutter to identify it by its collector number.'
                : 'Use manual entry to look up a card by collector number.',
            textAlign: TextAlign.center,
            style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant),
          ),
        ),
      );
    }
    final pricing = ref.watch(pricingProvider);
    return ListView.separated(
      itemCount: _matches.length,
      separatorBuilder: (_, _) => const Divider(height: 1, indent: 72),
      itemBuilder: (context, i) {
        final card = _matches[i];
        return CardRow(
          card: card,
          priceLabel: pricing.priceLabel(card),
          onTap: () => Navigator.of(context).push(MaterialPageRoute(
              builder: (_) => CardDetailScreen(card: card))),
          onAdd: () => showCardActions(context, ref, card),
        );
      },
    );
  }
}

class _ScanOverlay extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Center(
        child: Container(
          margin: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.white70, width: 2),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Align(
            alignment: Alignment.bottomCenter,
            child: Padding(
              padding: EdgeInsets.all(8),
              child: Text(
                'Frame the card • number sits bottom-left',
                style: TextStyle(color: Colors.white, fontSize: 12),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
