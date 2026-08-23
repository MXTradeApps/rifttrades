/**
 * Find catalog cards whose price most closely matches the value gap
 * between the two sides of a trade (ported from the RiftTrades mobile app).
 */

export const FILLER_MAX_RESULTS = 60;
export const FILLER_BALANCE_THRESHOLD = 0.01;

/**
 * @param {number} haveTotal
 * @param {number} wantTotal
 * @returns {{ target: number, balanced: boolean, fillSide: 'have' | 'want', sideIsMine: boolean }}
 */
export function getFillerGap(haveTotal, wantTotal) {
    // + gap => their side is worth more, so MY (have) side needs value.
    // - gap => my side is worth more, so THEIR (want) side needs value.
    const gap = wantTotal - haveTotal;
    const target = Math.abs(gap);
    const balanced = target < FILLER_BALANCE_THRESHOLD;
    const fillSide = gap > 0 ? 'have' : 'want';

    return {
        target,
        balanced,
        fillSide,
        sideIsMine: fillSide === 'have',
    };
}

/**
 * @param {object[]} catalog - Full card catalog
 * @param {number} target - Absolute value gap to fill
 * @param {(card: object) => number} getPrice - Resolves current price for a card
 * @param {number} [maxResults]
 * @returns {{ card: object, price: number, gapDistance: number }[]}
 */
export function findFillerMatches(catalog, target, getPrice, maxResults = FILLER_MAX_RESULTS) {
    const matches = [];

    for (const card of catalog) {
        const price = getPrice(card);
        if (price == null || !(price > 0)) continue;

        matches.push({
            card,
            price,
            gapDistance: Math.abs(price - target),
        });
    }

    matches.sort((a, b) => a.gapDistance - b.gapDistance);
    return matches.slice(0, maxResults);
}

/**
 * @param {{ price: number, gapDistance: number }} match
 * @param {number} target
 * @param {(amount: number) => string} formatPrice
 * @returns {string}
 */
export function getClosenessLabel(match, target, formatPrice) {
    if (match.gapDistance < FILLER_BALANCE_THRESHOLD) return 'Exact match';
    const over = match.price > target;
    return `${formatPrice(match.gapDistance)} ${over ? 'over' : 'under'}`;
}
