import contract from '../fixtures/free_limits_binders.json';
import {
    FreeLimits,
    canAddDistinctCard,
    canCreateBinder,
} from '../../src/utils/freeLimits.js';

describe('free limits binders contract', () => {
    test('pins per-Binder binderCards and binders paywall', () => {
        expect(contract.limits.binderCards).toBe(50);
        expect(contract.limits.binders).toBe(4);
        expect(contract.behaviour.binderCards).toBe('refuse');
        expect(contract.behaviour.binders).toBe('paywall');
        expect(FreeLimits.binderCards).toBe(contract.limits.binderCards);
        expect(FreeLimits.binders).toBe(contract.limits.binders);
        expect(contract.wantListCards).toBe('unchanged');
        expect(FreeLimits.wantListCards).toBe(25);
        expect(FreeLimits.loanedCards).toBe(25);
    });

    contract.cases.forEach((testCase) => {
        test(testCase.name, () => {
            if (testCase.limit === 'binders') {
                expect(
                    canCreateBinder(testCase.existing, { isPro: Boolean(testCase.isPro) }),
                ).toBe(testCase.allowed);
                return;
            }

            if (testCase.action === 'same-printing-two-binders') {
                expect(testCase.countsAsOneInEach).toBe(true);
                expect(canAddDistinctCard(testCase.tradeDistinct, {
                    isWanted: false,
                    isPro: false,
                })).toBe(true);
                expect(canAddDistinctCard(testCase.collectionDistinct, {
                    isWanted: false,
                    isPro: false,
                })).toBe(true);
                return;
            }

            if (testCase.printingAlreadyInDestination || testCase.action === 'quantity-up') {
                expect(testCase.allowed).toBe(true);
                return;
            }

            expect(canAddDistinctCard(testCase.destinationDistinct, {
                isWanted: false,
                isPro: Boolean(testCase.isPro),
            })).toBe(testCase.allowed);
        });
    });
});
