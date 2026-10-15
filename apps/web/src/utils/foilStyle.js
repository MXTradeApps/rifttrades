/**
 * Colour coding for Riftbound finishes so printings can be told apart at a
 * glance: pack foil, promo / Nexus Night and plain foil each get their own
 * swatch. Normal printings get none.
 */
export const foilTagStyle = (subTypeName, isDark) => {
    const sub = (subTypeName || '').toLowerCase();
    if (sub.includes('pack foil')) {
        return isDark
            ? { backgroundColor: 'rgba(229, 192, 120, 0.16)', color: '#F0D498' }
            : { backgroundColor: '#FBF0D2', color: '#6B4C00' };
    }
    if (sub.includes('nexus night') || sub.includes('promo')) {
        return isDark
            ? { backgroundColor: 'rgba(168, 140, 255, 0.16)', color: '#C9B8FF' }
            : { backgroundColor: '#EEE8FB', color: '#4A2E8A' };
    }
    if (sub.includes('foil') || sub.includes('holo')) {
        return isDark
            ? { background: 'linear-gradient(90deg, rgba(90,186,218,0.22), rgba(229,192,120,0.22))', color: '#E8F1F5' }
            : { background: 'linear-gradient(90deg, #DCEFF6, #F8EED6)', color: '#0D4560' };
    }
    return null;
};
