import { buildTradePost } from '../../src/utils/salePost.js';

const wants = [
    { name: 'Yasuo, Windrider (Alternate Art)', finish: 'Foil', quantity: 2, price: 39.99 },
    { name: 'Long Sword', finish: 'Normal', quantity: 1, price: 1.2 },
];

const items = [
    { name: 'Blade Dancer', finish: 'Normal', condition: 'LP', quantity: 1, price: 4.5 },
    { name: 'Cleave', finish: 'Foil', quantity: 2, price: 12 },
];

describe('buildTradePost', () => {
    it('writes an unpriced WTT post with both sides', () => {
        expect(buildTradePost({ mode: 'wtt', wants, items })).toEqual([
            [
                'WTT - Riftbound singles',
                '',
                'Looking for:',
                '2x Foil Yasuo, Windrider (Alternate Art)',
                'Long Sword',
                '',
                'Have:',
                '2x Foil Cleave',
                'Blade Dancer (LP)',
                '',
                'Looking to trade, all NM unless noted. DM me!',
                'Made on riftrades.com',
            ].join('\n'),
        ]);
    });

    it('writes a priced WTS post of only the cards you have', () => {
        expect(buildTradePost({ mode: 'wts', wants, items, percent: 90, pricedOn: 'Oct 26, 2026' })).toEqual([
            [
                'WTS - Riftbound singles',
                'Prices are 90% of TCGplayer market (Oct 26, 2026)',
                '',
                '2x Foil Cleave $11 ea',
                'Blade Dancer (LP) $4.05',
                '',
                '3 cards · $26 total',
                'All NM unless noted. DM me!',
                'Made on riftrades.com',
            ].join('\n'),
        ]);
    });

    it('defaults to WTT and drops an empty side', () => {
        const [post] = buildTradePost({ wants, items: [] });
        expect(post).toContain('Looking for:');
        expect(post).not.toContain('Have:');
        expect(post.endsWith('Made on riftrades.com')).toBe(true);
    });

    it('returns nothing when there is nothing to post', () => {
        expect(buildTradePost({ mode: 'wtt', wants: [], items: [] })).toEqual([]);
        expect(buildTradePost({ mode: 'wts', wants, items: [] })).toEqual([]);
    });

    it('uses no Discord-only markdown', () => {
        buildTradePost({ mode: 'wtt', wants, items }).concat(buildTradePost({ mode: 'wts', items }))
            .forEach((post) => expect(post).not.toContain('**'));
    });

    it('splits long posts under the limit without leading blank lines', () => {
        const many = Array.from({ length: 80 }, (_, i) => ({ name: `Card number ${i}`, finish: 'Normal', quantity: 1, price: i + 1 }));
        const posts = buildTradePost({ mode: 'wtt', wants: many, items: many, limit: 500 });
        expect(posts.length).toBeGreaterThan(1);
        posts.forEach((post) => {
            expect(post.length).toBeLessThanOrEqual(500);
            expect(post.startsWith('\n')).toBe(false);
        });
    });
});
