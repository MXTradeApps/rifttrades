import { FEATURES_UNLOCKED, hasProFeatures } from '../../src/utils/featureAccess.js';

describe('featureAccess', () => {
    test('unlocks every feature while the product switch is on', () => {
        expect(FEATURES_UNLOCKED).toBe(true);
        expect(hasProFeatures(false)).toBe(true);
        expect(hasProFeatures(true)).toBe(true);
    });
});
