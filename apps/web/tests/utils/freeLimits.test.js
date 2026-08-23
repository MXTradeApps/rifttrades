import {
    FreeLimits,
    canAddDistinctCard,
    cardsFor,
    tradesOverFreeLimit,
} from '../../src/utils/freeLimits.js';

describe('freeLimits', () => {
    test('exposes binder/want caps of 50 and savedTrades of 3', () => {
        expect(FreeLimits.binderCards).toBe(50);
        expect(FreeLimits.wantListCards).toBe(25);
        expect(FreeLimits.savedTrades).toBe(3);
        expect(FreeLimits.loanedCards).toBe(25);
        expect(cardsFor({ isWanted: false })).toBe(50);
        expect(cardsFor({ isWanted: true })).toBe(25);
    });

    test('refuses a new distinct card at the free cap', () => {
        expect(canAddDistinctCard(50, { isWanted: false, isPro: false })).toBe(false);
        expect(canAddDistinctCard(49, { isWanted: false, isPro: false })).toBe(true);
    });

    test('Pro bypasses the distinct-card cap', () => {
        expect(canAddDistinctCard(999, { isWanted: true, isPro: true })).toBe(true);
    });

    test('tradesOverFreeLimit counts how many oldest trades to trim', () => {
        expect(tradesOverFreeLimit(3)).toBe(0);
        expect(tradesOverFreeLimit(5)).toBe(2);
    });
});
