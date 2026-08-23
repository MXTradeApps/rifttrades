import { buildSetsList, slugifySetName } from '../../src/utils/sets.js';

describe('slugifySetName', () => {
    test('slugifies set names', () => {
        expect(slugifySetName('Spiritforged')).toBe('spiritforged');
        expect(slugifySetName('Origins Prologue')).toBe('origins-prologue');
    });
});

describe('buildSetsList', () => {
    test('returns empty when cards are missing', () => {
        expect(buildSetsList(undefined)).toEqual([]);
        expect(buildSetsList([])).toEqual([]);
    });

    test('groups cards by set with counts, top price, and slug', () => {
        const cards = [
            { _setName: 'Spiritforged', _setNumber: 2, extNumber: '001', marketPrice: 12 },
            { _setName: 'Origins', _setNumber: 1, extNumber: '010', marketPrice: 5 },
            { _setName: 'Origins', _setNumber: 1, extNumber: '011', marketPrice: 40 },
            { _setName: 'Spiritforged', _setNumber: 2, extNumber: null, marketPrice: 99 },
            { name: 'No set' },
        ];

        expect(buildSetsList(cards)).toEqual([
            {
                name: 'Origins',
                number: 1,
                groupId: null,
                count: 2,
                cardCount: 2,
                topMarketPrice: 40,
                slug: 'origins',
            },
            {
                name: 'Spiritforged',
                number: 2,
                groupId: null,
                count: 1,
                cardCount: 1,
                topMarketPrice: 12,
                slug: 'spiritforged',
            },
        ]);
    });
});
