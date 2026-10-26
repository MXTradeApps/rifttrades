import { buildSalePost, buildTradePost } from '../../src/utils/salePost.js';

const wants = [
    { name: 'Yasuo, Windrider (Alternate Art)', finish: 'Foil', quantity: 2, price: 39.99 },
    { name: 'Long Sword', finish: 'Normal', quantity: 1, price: 1.2 },
];

const items = [
    { name: 'Blade Dancer', finish: 'Normal', condition: 'LP', quantity: 1, price: 4.5 },
    { name: 'Cleave', finish: 'Foil', quantity: 2, price: 12 },
];

describe('buildTradePost', () => {
    it('writes Looking for and a priced Have list for Discord', () => {
        expect(buildTradePost({ mode: 'wtt-wts', platform: 'discord', wants, items, pricedOn: 'Oct 26, 2026' })).toEqual([
            [
                '**WTT/WTS** · prices are TCGplayer market (Oct 26, 2026)',
                '',
                '**Looking for**',
                '2x Foil Yasuo, Windrider (Alternate Art)',
                'Long Sword',
                '',
                '**Have**',
                '2x Foil Cleave $12 ea',
                'Blade Dancer (LP) $4.50',
                '',
                'Happy to trade or sell, all NM unless noted. DM me!',
                'Made on riftrades.com',
            ].join('\n'),
        ]);
    });

    it('leaves prices out in WTT mode', () => {
        const [post] = buildTradePost({ mode: 'wtt', platform: 'discord', wants, items });
        expect(post.startsWith('**WTT**\n')).toBe(true);
        expect(post).not.toMatch(/\$/);
        expect(post).toContain('Looking to trade, all NM unless noted. DM me!');
    });

    it('drops an empty side', () => {
        const [post] = buildTradePost({ mode: 'wtt-wts', platform: 'discord', wants, items: [] });
        expect(post).toContain('**Looking for**');
        expect(post).not.toContain('**Have**');
        expect(post.split('\n')[0]).toBe('**WTT/WTS**');
    });

    it('returns nothing for an empty trade', () => {
        expect(buildTradePost({ mode: 'wtt', platform: 'discord', wants: [], items: [] })).toEqual([]);
    });

    it('is the plain sale post in WTS mode', () => {
        const options = { platform: 'discord', items, percent: 90, pricedOn: 'Oct 26, 2026' };
        expect(buildTradePost({ ...options, mode: 'wts', wants })).toEqual(buildSalePost(options));
    });

    it('writes one Facebook message with both sections', () => {
        const posts = buildTradePost({ mode: 'wtt-wts', platform: 'facebook', wants, items, link: 'https://riftrades.com/b/abc' });
        expect(posts).toHaveLength(1);
        expect(posts[0].split('\n')).toEqual([
            'WTT/WTS - Riftbound singles',
            'Happy to trade or sell. Prices are TCGplayer market. All NM unless noted. Comment or message me!',
            '',
            'Looking for:',
            '2x Yasuo, Windrider (Alternate Art) (Foil)',
            'Long Sword',
            '',
            'Have:',
            '2x Cleave (Foil) - $12 each',
            'Blade Dancer (LP) - $4.50',
            '',
            'Full list: https://riftrades.com/b/abc',
        ]);
    });

    it('splits long Discord posts under the limit without leading blank lines', () => {
        const many = Array.from({ length: 80 }, (_, i) => ({ name: `Card number ${i}`, finish: 'Normal', quantity: 1, price: i + 1 }));
        const posts = buildTradePost({ mode: 'wtt-wts', platform: 'discord', wants: many, items: many, limit: 500 });
        expect(posts.length).toBeGreaterThan(1);
        posts.forEach((post) => {
            expect(post.length).toBeLessThanOrEqual(500);
            expect(post.startsWith('\n')).toBe(false);
        });
    });
});
