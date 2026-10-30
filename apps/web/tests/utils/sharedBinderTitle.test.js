import { sharedBinderTitle } from '../../src/utils/binderNames.js';

describe('sharedBinderTitle', () => {
    it("titles the page with the owner's name", () => {
        expect(sharedBinderTitle('Max')).toBe('Max’s Binder');
        expect(sharedBinderTitle(' James ')).toBe('James’ Binder');
    });

    it('falls back when there is no name', () => {
        expect(sharedBinderTitle(null)).toBe('Shared Binder');
        expect(sharedBinderTitle('   ')).toBe('Shared Binder');
    });
});
