/// A single Riftbound card printing, mirroring a row of the `cards_with_prices`
/// Supabase view. Normal and Foil are distinct rows (distinct [id]).
class CardModel {
  final String id; // stable printing key, e.g. "684123-foil"
  final int? productId;
  final int? setId;
  final String? uniqueId;
  final String name;
  final String? cleanName;
  final String? setName;
  final String? subTypeName;
  final bool isFoil;
  final String? rarity;
  final String? collectorNumber;
  final String? imageUrl;
  final String? tcgplayerUrl;
  final int? cardmarketId;

  // TCGplayer prices (USD, nullable).
  final double? tcgLow;
  final double? tcgMid;
  final double? tcgHigh;
  final double? tcgMarket;
  final double? tcgDirectLow;

  // CardMarket prices (EUR, nullable).
  final double? cmAvg;
  final double? cmLow;
  final double? cmTrend;
  final double? cmAvgFoil;
  final double? cmLowFoil;
  final double? cmTrendFoil;

  const CardModel({
    required this.id,
    required this.name,
    this.productId,
    this.setId,
    this.uniqueId,
    this.cleanName,
    this.setName,
    this.subTypeName,
    this.isFoil = false,
    this.rarity,
    this.collectorNumber,
    this.imageUrl,
    this.tcgplayerUrl,
    this.cardmarketId,
    this.tcgLow,
    this.tcgMid,
    this.tcgHigh,
    this.tcgMarket,
    this.tcgDirectLow,
    this.cmAvg,
    this.cmLow,
    this.cmTrend,
    this.cmAvgFoil,
    this.cmLowFoil,
    this.cmTrendFoil,
  });

  factory CardModel.fromMap(Map<String, dynamic> map) {
    return CardModel(
      id: map['id'] as String,
      productId: _toInt(map['product_id']),
      setId: _toInt(map['set_id']),
      uniqueId: map['unique_id'] as String?,
      name: (map['name'] as String?) ?? '',
      cleanName: map['clean_name'] as String?,
      setName: map['set_name'] as String?,
      subTypeName: map['sub_type_name'] as String?,
      isFoil: (map['is_foil'] as bool?) ?? false,
      rarity: map['rarity'] as String?,
      collectorNumber: map['collector_number'] as String?,
      imageUrl: map['image_url'] as String?,
      tcgplayerUrl: map['tcgplayer_url'] as String?,
      cardmarketId: _toInt(map['cardmarket_id']),
      tcgLow: _toDouble(map['tcg_low']),
      tcgMid: _toDouble(map['tcg_mid']),
      tcgHigh: _toDouble(map['tcg_high']),
      tcgMarket: _toDouble(map['tcg_market']),
      tcgDirectLow: _toDouble(map['tcg_direct_low']),
      cmAvg: _toDouble(map['cm_avg']),
      cmLow: _toDouble(map['cm_low']),
      cmTrend: _toDouble(map['cm_trend']),
      cmAvgFoil: _toDouble(map['cm_avg_foil']),
      cmLowFoil: _toDouble(map['cm_low_foil']),
      cmTrendFoil: _toDouble(map['cm_trend_foil']),
    );
  }

  /// Full serialization back to the `cards_with_prices` column names, so a
  /// printing round-trips losslessly through [fromMap]. Used by the offline
  /// catalog cache (unlike [toStub], which drops price detail columns).
  Map<String, dynamic> toMap() => {
        'id': id,
        'product_id': productId,
        'set_id': setId,
        'unique_id': uniqueId,
        'name': name,
        'clean_name': cleanName,
        'set_name': setName,
        'sub_type_name': subTypeName,
        'is_foil': isFoil,
        'rarity': rarity,
        'collector_number': collectorNumber,
        'image_url': imageUrl,
        'tcgplayer_url': tcgplayerUrl,
        'cardmarket_id': cardmarketId,
        'tcg_low': tcgLow,
        'tcg_mid': tcgMid,
        'tcg_high': tcgHigh,
        'tcg_market': tcgMarket,
        'tcg_direct_low': tcgDirectLow,
        'cm_avg': cmAvg,
        'cm_low': cmLow,
        'cm_trend': cmTrend,
        'cm_avg_foil': cmAvgFoil,
        'cm_low_foil': cmLowFoil,
        'cm_trend_foil': cmTrendFoil,
      };

  /// Compact map used to cache a printing alongside user data (collection/trades),
  /// so those screens can render without a network round-trip.
  Map<String, dynamic> toStub() => {
        'id': id,
        'product_id': productId,
        'name': name,
        'set_name': setName,
        'sub_type_name': subTypeName,
        'is_foil': isFoil,
        'rarity': rarity,
        'collector_number': collectorNumber,
        'image_url': imageUrl,
        'tcg_market': tcgMarket,
        'tcg_low': tcgLow,
        'cm_trend': cmTrend,
        'cm_low': cmLow,
      };

  factory CardModel.fromStub(Map<String, dynamic> map) => CardModel.fromMap(map);

  /// Label for the finish, e.g. "Normal" / "Foil".
  String get finishLabel => isFoil ? 'Foil' : (subTypeName ?? 'Normal');

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

/// One day's price snapshot for a printing (from `price_history`).
class PricePoint {
  final DateTime capturedOn;
  final double? tcgMarket;
  final double? tcgLow;
  final double? cmTrend;
  final double? cmLow;

  const PricePoint({
    required this.capturedOn,
    this.tcgMarket,
    this.tcgLow,
    this.cmTrend,
    this.cmLow,
  });

  factory PricePoint.fromMap(Map<String, dynamic> map) {
    return PricePoint(
      capturedOn: DateTime.parse(map['captured_on'] as String),
      tcgMarket: CardModel._toDouble(map['tcg_market']),
      tcgLow: CardModel._toDouble(map['tcg_low']),
      cmTrend: CardModel._toDouble(map['cm_trend']),
      cmLow: CardModel._toDouble(map['cm_low']),
    );
  }
}
