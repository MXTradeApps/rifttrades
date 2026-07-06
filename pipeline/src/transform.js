import { normalizeCardName } from './cardmarket.js';

// Products that are not individual cards (booster packs, boxes, accessories, ...).
const SEALED_PATTERNS = [
  'booster box', 'booster pack', 'booster display', 'starter deck', 'starter kit',
  'bundle', 'collector box', 'case', 'display', 'prerelease', 'deck box',
  'playmat', 'sleeves'
];

export function isSealedProduct(row) {
  const name = (row.name || '').toLowerCase();
  const subTypeName = (row.subTypeName || '').toLowerCase();
  return SEALED_PATTERNS.some((p) => name.includes(p) || subTypeName.includes(p));
}

// TCGCSV price fields arrive as strings, sometimes empty. Parse safely to number|null.
export function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

export function toBigInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

// Turn one set's raw product rows into DB rows for cards / card_prices / price_history.
export function buildRows(groupProducts, groupId, cmByName) {
  const cards = [];
  const prices = [];
  const history = [];

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const setId = toBigInt(groupId);

  for (const row of groupProducts) {
    const productId = toBigInt(row.productId);
    if (!productId || !row.name) continue;

    const isFoil = (row.subTypeName || '').toLowerCase().includes('foil');

    // Match CardMarket by cleanName first, then name.
    const cm =
      cmByName.get(normalizeCardName(row.cleanName)) ||
      cmByName.get(normalizeCardName(row.name)) ||
      null;

    cards.push({
      product_id: productId,
      set_id: setId,
      unique_id: `RB${productId}`,
      name: row.name,
      clean_name: row.cleanName || null,
      image_url: row.imageUrl || null,
      tcgplayer_url: row.url || null,
      sub_type_name: row.subTypeName || null,
      is_foil: isFoil,
      rarity: row.extRarity || row.rarity || null,
      collector_number: row.extNumber || row.number || null,
      is_sealed: isSealedProduct(row),
      cardmarket_id: cm ? cm.idProduct : null,
      cardmarket_name: cm ? cm.name : null,
      modified_on: row.modifiedOn || null,
      updated_at: now
    });

    const tcgMarket = toNumber(row.marketPrice);
    const tcgLow = toNumber(row.lowPrice);
    const cmTrend = cm ? toNumber(cm.trend) : null;
    const cmLow = cm ? toNumber(cm.low) : null;

    prices.push({
      card_id: productId,
      tcg_low: tcgLow,
      tcg_mid: toNumber(row.midPrice),
      tcg_high: toNumber(row.highPrice),
      tcg_market: tcgMarket,
      tcg_direct_low: toNumber(row.directLowPrice),
      cm_avg: cm ? toNumber(cm.avg) : null,
      cm_low: cmLow,
      cm_trend: cmTrend,
      cm_avg_foil: cm ? toNumber(cm.avgFoil) : null,
      cm_low_foil: cm ? toNumber(cm.lowFoil) : null,
      cm_trend_foil: cm ? toNumber(cm.trendFoil) : null,
      updated_at: now
    });

    history.push({
      card_id: productId,
      captured_on: today,
      tcg_market: tcgMarket,
      tcg_low: tcgLow,
      cm_trend: cmTrend,
      cm_low: cmLow
    });
  }

  return { cards, prices, history };
}
