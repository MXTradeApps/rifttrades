import contract from '../fixtures/binder_cover.json';
import { pickBinderCover } from '../../src/utils/binderCover.js';

describe('binder cover contract', () => {
    contract.cases.forEach((testCase) => {
        test(testCase.name, () => {
            const cover = pickBinderCover(testCase.entries, {
                source: testCase.source,
                headline: testCase.headline,
            });
            expect(cover.printingId).toBe(testCase.expected.printingId);
            if (testCase.expected.condition != null) {
                expect(cover.condition).toBe(testCase.expected.condition);
            }
        });
    });
});
