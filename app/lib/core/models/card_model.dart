/// A single Riftbound card printing, mirroring a row of the `cards_with_prices`
/// Supabase view. Normal and Foil are distinct rows (distinct [id]).
class CardModel {
  final String id; // stable printing key, e.g. "684123-foil"
  final int? productId;
  final String name;
  final String? setName;
  final String? subTypeName;
  final bool isFoil;
  final String? rarity;
  final String? collectorNumber;
  final String? imageUrl;

  // Prices (nullable — a printing may be unpriced or have no EU match).
  final double? tcgMarket; // USD
  final double? tcgLow; // USD
  final double? cmTrend; // EUR
  final double? cmLow; // EUR

  const CardModel({
    required this.id,
    required this.name,
    this.productId,
    this.setName,
    this.subTypeName,
    this.isFoil = false,
    this.rarity,
    this.collectorNumber,
    this.imageUrl,
    this.tcgMarket,
    this.tcgLow,
    this.cmTrend,
    this.cmLow,
  });

  factory CardModel.fromMap(Map<String, dynamic> map) {
    return CardModel(
      id: map['id'] as String,
      productId: _toInt(map['product_id']),
      name: (map['name'] as String?) ?? '',
      setName: map['set_name'] as String?,
      subTypeName: map['sub_type_name'] as String?,
      isFoil: (map['is_foil'] as bool?) ?? false,
      rarity: map['rarity'] as String?,
      collectorNumber: map['collector_number'] as String?,
      imageUrl: map['image_url'] as String?,
      tcgMarket: _toDouble(map['tcg_market']),
      tcgLow: _toDouble(map['tcg_low']),
      cmTrend: _toDouble(map['cm_trend']),
      cmLow: _toDouble(map['cm_low']),
    );
  }

  // PostgREST can return numeric columns as num or String; handle both.
  static double? _toDouble(dynamic v) {
    if (v == null) return null;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString());
  }

  static int? _toInt(dynamic v) {
    if (v == null) return null;
    if (v is num) return v.toInt();
    return int.tryParse(v.toString());
  }
}
