import {
    isSignatureCard,
    isOvernumberedCard,
    isShowcaseCard,
    parseCardVariant,
} from '../../src/utils/riftboundCards.js';

describe('riftboundCards', () => {
    test('detects signature printings', () => {
        expect(isSignatureCard({ name: 'Ahri (Signature)', extNumber: '227*/221' })).toBe(true);
        expect(isSignatureCard({ name: 'Ahri', extNumber: '010/221' })).toBe(false);
    });

    test('detects overnumbered printings without counting signatures', () => {
        expect(isOvernumberedCard({ extNumber: '220/219' })).toBe(true);
        expect(isOvernumberedCard({ extNumber: '100/219' })).toBe(false);
        expect(isOvernumberedCard({ name: 'Ahri (Signature)', extNumber: '227*/221' })).toBe(false);
    });

    test('detects showcase rarity', () => {
        expect(isShowcaseCard({ extRarity: 'Showcase' })).toBe(true);
        expect(isShowcaseCard({ name: 'Foo (Showcase)', extRarity: 'Rare' })).toBe(true);
        expect(isShowcaseCard({ extRarity: 'Rare' })).toBe(false);
    });

    test('parses Riftbound art variants out of the title', () => {
        expect(parseCardVariant('Ahri (Signature)')).toEqual({
            baseName: 'Ahri',
            artVariant: 'Signature',
        });
        expect(parseCardVariant('Ambessa')).toEqual({
            baseName: 'Ambessa',
            artVariant: null,
        });
    });
});
