import { supabase } from '../lib/supabase.js';

/**
 * Ranked recent Low movers for a marketplace (`rift_recent_movers`). Omit
 * [cardIds] for catalog-wide; pass Printing ids to rank only those. Does not
 * default a bad source.
 *
 * @param {'tcgplayer'|'cardmarket'} source
 * @param {string[]} [cardIds]
 */
export const recentMovers = async (source, cardIds) => {
    const params = { p_source: source };
    if (cardIds !== undefined) {
        params.p_card_ids = cardIds;
    }
    const { data, error } = await supabase.rpc('rift_recent_movers', params);
    if (error) throw new Error(`Recent movers request failed: ${error.message}`);
    return Array.isArray(data) ? data : [];
};

/** Splits ranked rows into gainers and losers, keeping their order. */
export const splitMoversByDirection = (rows) => {
    const gainers = [];
    const losers = [];
    for (const row of rows || []) {
        if (row?.direction === 'gainer') gainers.push(row);
        else if (row?.direction === 'loser') losers.push(row);
    }
    return { gainers, losers };
};
