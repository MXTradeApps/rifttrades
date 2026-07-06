import 'card_model.dart';

/// A card the user has lent out or is borrowing, associated with a person.
/// Each entry is one person on one side of a loan. The [personName] is optional.
class LendEntry {
  final String id;
  final CardModel card;
  final int quantity;
  final String? personName; // optional — who the card is lent to / borrowed from
  final bool isBorrowing; // true => borrowing from someone, false => lent out
  final DateTime addedAt;

  const LendEntry({
    required this.id,
    required this.card,
    this.quantity = 1,
    this.personName,
    this.isBorrowing = false,
    required this.addedAt,
  });

  LendEntry copyWith({
    int? quantity,
    String? personName,
    bool clearPersonName = false,
    bool? isBorrowing,
  }) =>
      LendEntry(
        id: id,
        card: card,
        quantity: quantity ?? this.quantity,
        personName: clearPersonName ? null : (personName ?? this.personName),
        isBorrowing: isBorrowing ?? this.isBorrowing,
        addedAt: addedAt,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'card': card.toStub(),
        'quantity': quantity,
        'person_name': personName,
        'is_borrowing': isBorrowing,
        'added_at': addedAt.toIso8601String(),
      };

  factory LendEntry.fromJson(Map<String, dynamic> json) => LendEntry(
        id: (json['id'] as String?) ??
            DateTime.now().microsecondsSinceEpoch.toString(),
        card: CardModel.fromStub(
            Map<String, dynamic>.from(json['card'] as Map)),
        quantity: (json['quantity'] as num?)?.toInt() ?? 1,
        personName: (json['person_name'] as String?)?.trim().isEmpty ?? true
            ? null
            : (json['person_name'] as String).trim(),
        isBorrowing: (json['is_borrowing'] as bool?) ?? false,
        addedAt: DateTime.tryParse(json['added_at'] as String? ?? '') ??
            DateTime.now(),
      );
}
