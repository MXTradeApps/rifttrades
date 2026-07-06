import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/widgets.dart';
import '../../core/data/card_repository.dart';
import '../../core/models/card_model.dart';
import '../../core/providers.dart';

/// A search screen that returns the picked [CardModel] via Navigator.pop.
class CardPickerScreen extends ConsumerStatefulWidget {
  const CardPickerScreen({super.key, this.title = 'Add a card'});
  final String title;

  static Future<CardModel?> show(BuildContext context, {String? title}) {
    return Navigator.of(context).push<CardModel>(
      MaterialPageRoute(
        builder: (_) => CardPickerScreen(title: title ?? 'Add a card'),
      ),
    );
  }

  @override
  ConsumerState<CardPickerScreen> createState() => _CardPickerScreenState();
}

class _CardPickerScreenState extends ConsumerState<CardPickerScreen> {
  final _controller = TextEditingController();
  Timer? _debounce;
  Future<List<CardModel>>? _future;
  bool _foilOnly = false;

  @override
  void initState() {
    super.initState();
    _run('');
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _run(String q) {
    setState(() {
      _future = ref.read(cardRepositoryProvider).search(
            CardFilters(query: q, foilOnly: _foilOnly, sort: CardSort.nameAsc),
          );
    });
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () => _run(value));
  }

  @override
  Widget build(BuildContext context) {
    final pricing = ref.watch(pricingProvider);
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
            child: TextField(
              controller: _controller,
              autofocus: true,
              onChanged: _onChanged,
              decoration: const InputDecoration(
                hintText: 'Search cards…',
                prefixIcon: Icon(Icons.search),
              ),
            ),
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: FilterChip(
                label: const Text('Foil only'),
                avatar: const Icon(Icons.auto_awesome, size: 16),
                selected: _foilOnly,
                onSelected: (v) {
                  _foilOnly = v;
                  _run(_controller.text);
                },
              ),
            ),
          ),
          Expanded(
            child: FutureBuilder<List<CardModel>>(
              future: _future,
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                final cards = snap.data ?? const [];
                if (cards.isEmpty) {
                  return const Center(child: Text('No cards found.'));
                }
                return ListView.separated(
                  itemCount: cards.length,
                  separatorBuilder: (_, _) =>
                      const Divider(height: 1, indent: 72),
                  itemBuilder: (context, i) {
                    final card = cards[i];
                    return CardRow(
                      card: card,
                      priceLabel: pricing.priceLabel(card),
                      trailing: const Icon(Icons.add_circle),
                      onTap: () => Navigator.of(context).pop(card),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
