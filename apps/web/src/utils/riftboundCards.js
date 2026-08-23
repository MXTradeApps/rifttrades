/**
 * Riftbound-specific printing helpers used by the set price guide.
 */

/** Signature alts: "(Signature)" in the name and/or `*` in the collector number. */
export const isSignatureCard = (card) => {
    const name = (card?.name || '').toLowerCase();
    const num = card?.extNumber || '';
    return name.includes('(signature)') || num.includes('*');
};

/**
 * Overnumbered alts: collector number greater than the printed set total
 * (e.g. "220/219"). Signatures are excluded so their toggle stays independent.
 */
export const isOvernumberedCard = (card) => {
    const raw = card?.extNumber || '';
    if (raw.includes('*')) return false;
    const match = raw.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (!match) return false;
    const num = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    if (!Number.isFinite(num) || !Number.isFinite(total) || total === 0) return false;
    return num > total;
};

/** Showcase rarity (often paired with overnumbered / signature alts). */
export const isShowcaseCard = (card) => {
    const rarity = (card?.extRarity || '').toLowerCase();
    const name = (card?.name || '').toLowerCase();
    return rarity === 'showcase' || name.includes('(showcase)');
};

/** Parentheticals that should become chips instead of staying in the title. */
const RIFTBOUND_VARIANT_KEYWORDS = [
    'Signature',
    'Overnumbered',
    'Showcase',
];

/**
 * Split Riftbound alt-printing markers out of the display name.
 * e.g. "Ahri (Signature)" → { baseName: "Ahri", artVariant: "Signature" }
 */
export const parseCardVariant = (name = '') => {
    const match = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    if (!match) return { baseName: name, artVariant: null };
    const inner = match[2].trim();
    const lower = inner.toLowerCase();
    const isVariant = RIFTBOUND_VARIANT_KEYWORDS.some((k) => lower.includes(k.toLowerCase()));
    if (!isVariant) return { baseName: name, artVariant: null };
    return { baseName: match[1].trim(), artVariant: inner };
};

export const rarityColor = (rarity, isDark) => {
    const r = (rarity || '').toLowerCase();
    if (r === 'epic') return isDark ? '#c084fc' : '#7c3aed';
    if (r === 'rare') return isDark ? '#fbbf24' : '#b8892e';
    if (r === 'uncommon') return isDark ? '#5abada' : '#1a5a7a';
    if (r === 'common') return isDark ? '#a0c4d4' : '#4c4359';
    if (r === 'showcase') return isDark ? '#f472b6' : '#db2777';
    if (r === 'promo') return isDark ? '#34d399' : '#059669';
    return isDark ? '#a0c4d4' : '#4c4359';
};
