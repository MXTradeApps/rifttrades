import { useMemo, useCallback } from 'react';
import { useCardData } from './useCardData.jsx';
import { buildSetsList, slugifySetName } from '../utils/sets.js';

/**
 * Derive the set browser from the in-memory catalog.
 */
export const useSets = () => {
    const { cards, dataReady, error, loading } = useCardData();

    const sets = useMemo(() => buildSetsList(cards), [cards]);

    const slugToName = useMemo(() => {
        const map = new Map();
        for (const set of sets) {
            if (set.slug) map.set(set.slug, set.name);
            map.set(slugifySetName(set.name), set.name);
            map.set(String(set.name).toLowerCase(), set.name);
            if (set.groupId != null) map.set(String(set.groupId), set.name);
            if (set.number != null) map.set(String(set.number), set.name);
        }
        return map;
    }, [sets]);

    const cardsBySetName = useMemo(() => {
        const map = new Map();
        if (!cards || cards.length === 0) return map;
        for (const card of cards) {
            if (!card._setName || !card.extNumber || !card.name) continue;
            if (!map.has(card._setName)) map.set(card._setName, []);
            map.get(card._setName).push(card);
        }
        return map;
    }, [cards]);

    /**
     * Resolve a route param (slug, set name, groupId, or set number) to a set
     * with its cards. Returns null when nothing matches.
     */
    const getSetById = useCallback((idOrSlug) => {
        if (!idOrSlug) return null;
        const key = String(idOrSlug);
        const setName =
            slugToName.get(key) ||
            slugToName.get(key.toLowerCase()) ||
            sets.find((s) => s.name === key)?.name ||
            null;
        if (!setName) return null;

        const meta = sets.find((s) => s.name === setName);
        const setCards = cardsBySetName.get(setName) || [];
        if (!meta && setCards.length === 0) return null;

        return {
            name: setName,
            number: meta?.number ?? setCards[0]?._setNumber ?? null,
            groupId: meta?.groupId ?? setCards[0]?.groupId ?? null,
            slug: meta?.slug || slugifySetName(setName),
            cardCount: setCards.length,
            topMarketPrice: meta?.topMarketPrice ?? 0,
            cards: setCards,
        };
    }, [sets, slugToName, cardsBySetName]);

    return {
        sets,
        getSetById,
        loading: loading || !dataReady,
        error,
    };
};

export default useSets;
