/**
 * Temporary product switch: every feature runs unlocked.
 *
 * Purchases, restore, entitlement rows, and free-limit helpers stay so a
 * paid tier can return. Flip to `false` (or mock this module in tests) to
 * enforce caps and Pro gates again.
 */
export const FEATURES_UNLOCKED = true;

/**
 * Whether product features should run as Pro.
 *
 * @param {boolean} [isPro]
 * @returns {boolean}
 */
export function hasProFeatures(isPro) {
    return FEATURES_UNLOCKED || Boolean(isPro);
}
