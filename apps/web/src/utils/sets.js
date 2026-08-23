/**
 * Set list helpers for the browse / price-guide pages.
 */

/** SEO-friendly slug from a set name. */
export function slugifySetName(name) {
    return String(name || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

/**
 * Build collision-free slugs for a list of sets.
 * @param {{ name: string, number?: number }[]} sets
 * @returns {Map<string, string>} set name → slug
 */
export function buildSetSlugMap(sets) {
    const used = new Map();
    const byName = new Map();

    for (const set of sets) {
        const base = slugifySetName(set.name) || `set-${set.number ?? 'x'}`;
        let slug = base;
        let n = 2;
        while (used.has(slug)) {
            slug = `${base}-${n++}`;
        }
        used.set(slug, set.name);
        byName.set(set.name, slug);
    }
    return byName;
}

/**
 * Build the browse set list from catalog cards.
 * Ordered by set number ascending. Only counts cards with an in-set number.
 */
export function buildSetsList(cards) {
    if (!cards || cards.length === 0) return [];

    const bySet = new Map();
    for (const card of cards) {
        if (!card._setName || !card.extNumber) continue;
        const existing = bySet.get(card._setName);
        const market = Number(card.marketPrice) || 0;
        if (existing) {
            existing.count += 1;
            if (market > existing.topMarketPrice) existing.topMarketPrice = market;
            if (!existing.groupId && card.groupId) existing.groupId = card.groupId;
        } else {
            bySet.set(card._setName, {
                name: card._setName,
                number: card._setNumber || 999,
                groupId: card.groupId || null,
                count: 1,
                topMarketPrice: market,
            });
        }
    }

    const list = Array.from(bySet.values()).sort((a, b) => a.number - b.number);
    const slugMap = buildSetSlugMap(list);
    return list.map((set) => ({
        ...set,
        slug: slugMap.get(set.name) || slugifySetName(set.name),
        cardCount: set.count,
    }));
}
