import { supabase } from '../lib/supabase.js';

// Supabase can only return up to 1000 rows per request, so we page through the
// full card catalog in chunks.
const PAGE_SIZE = 1000;

// Columns pulled from the related card_prices row.
const PRICE_SELECT =
    'tcg_low, tcg_mid, tcg_high, tcg_market, tcg_direct_low, ' +
    'cm_avg, cm_low, cm_trend, cm_avg_foil, cm_low_foil, cm_trend_foil, updated_at';

const CARD_SELECT = `*, sets(name, set_number), card_prices(${PRICE_SELECT})`;

// card_prices is a 1:1 relationship (card_id is its primary key), but PostgREST
// may embed it as either an object or a single-element array depending on how
// it detects the relationship. Normalize to a plain object.
const firstRelated = (related) => {
    if (Array.isArray(related)) return related[0] || {};
    return related || {};
};

// Map a Supabase card row (joined with sets + card_prices) into the same record
// shape the app's consolidated-data.json used, so downstream processing
// (createCardObject, grouping, pricing) works unchanged.
const mapRowToRecord = (row) => {
    const prices = firstRelated(row.card_prices);
    const set = firstRelated(row.sets);

    const setNumber = set.set_number ?? 0;

    return {
        // Unique identifiers
        _id: row.product_id,
        _uniqueId: row.id,
        _sourceFile: `set_${setNumber}.csv`,
        _setNumber: setNumber,
        _setName: set.name || '',

        // Core properties
        productId: row.product_id != null ? String(row.product_id) : '',
        name: row.name || '',
        cleanName: row.clean_name || '',
        imageUrl: row.image_url || '',
        categoryId: '89',
        groupId: row.set_id != null ? String(row.set_id) : '',
        url: row.tcgplayer_url || '',
        modifiedOn: row.modified_on || '',
        imageCount: 1,

        // TCGPlayer prices (USD)
        lowPrice: prices.tcg_low ?? '',
        midPrice: prices.tcg_mid ?? '',
        highPrice: prices.tcg_high ?? '',
        marketPrice: prices.tcg_market ?? '',
        directLowPrice: prices.tcg_direct_low ?? '',

        // Card properties
        subTypeName: row.sub_type_name || '',
        rarity: row.rarity || '',
        number: row.collector_number || '',

        // CardMarket prices (EUR)
        cardmarketId: row.cardmarket_id ?? null,
        cardmarketName: row.cardmarket_name ?? null,
        cardmarketAvg: prices.cm_avg ?? 0,
        cardmarketLow: prices.cm_low ?? 0,
        cardmarketTrend: prices.cm_trend ?? 0,
        cardmarketAvgFoil: prices.cm_avg_foil ?? 0,
        cardmarketLowFoil: prices.cm_low_foil ?? 0,
        cardmarketTrendFoil: prices.cm_trend_foil ?? 0
    };
};

// Fetch every card + its prices from the RiftTrades Supabase database and return
// data in the consolidated-data.json format ({ metadata, data }).
export const loadCardDataFromSupabase = async () => {
    const records = [];
    let latestUpdatedAt = null;

    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
            .from('cards')
            .select(CARD_SELECT)
            .order('id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);

        if (error) {
            throw new Error(`Supabase card query failed: ${error.message}`);
        }

        if (!data || data.length === 0) break;

        for (const row of data) {
            const prices = firstRelated(row.card_prices);
            if (prices.updated_at && (!latestUpdatedAt || prices.updated_at > latestUpdatedAt)) {
                latestUpdatedAt = prices.updated_at;
            }
            records.push(mapRowToRecord(row));
        }

        if (data.length < PAGE_SIZE) break;
    }

    const cardmarketMatchCount = records.filter((r) => r.cardmarketId !== null).length;

    return {
        metadata: {
            game: 'Riftbound',
            source: 'supabase',
            generatedAt: latestUpdatedAt,
            totalRecords: records.length,
            cardmarketMergedAt: latestUpdatedAt,
            cardmarketMatchCount,
            cardmarketNoMatchCount: records.length - cardmarketMatchCount
        },
        data: records
    };
};

// Returns the most recent price update time (ISO string) from Supabase.
export const fetchLastUpdatedFromSupabase = async () => {
    const { data, error } = await supabase
        .from('card_prices')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1);

    if (error) {
        throw new Error(`Supabase timestamp query failed: ${error.message}`);
    }

    return data?.[0]?.updated_at ?? null;
};
