/**
 * Owned-Printing helpers for ranking recent movers within a Binder.
 */

function printingId(entry) {
    return entry?.cardId || entry?.card_id || entry?.card?.id || null;
}

/**
 * Sums quantity per Printing id for a **pre-filtered** Binder list.
 * Display only — not a rank key and not sent to SQL.
 *
 * Callers MUST filter to the open Binder first. Do not change
 * [ownedPrintingIds] to take a binder id.
 */
export function copiesByPrintingId(entries) {
    const copies = new Map();
    for (const entry of entries || []) {
        if (entry?.isWanted || entry?.is_wanted) continue;
        if (entry?.deletedAt || entry?.deleted_at) continue;
        const qty = Number(entry?.quantity) || 0;
        if (qty <= 0) continue;
        const id = printingId(entry);
        if (!id) continue;
        copies.set(id, (copies.get(id) || 0) + qty);
    }
    return Object.fromEntries(copies);
}

/**
 * Distinct owned Printing ids: qty > 0 in any Binder, not Want List, not
 * tombstoned. Same Printing in two Binders or two conditions is one id.
 */
export function ownedPrintingIds(entries) {
    const ids = new Set();
    for (const entry of entries || []) {
        if (entry?.isWanted || entry?.is_wanted) continue;
        if (entry?.deletedAt || entry?.deleted_at) continue;
        const qty = Number(entry?.quantity) || 0;
        if (qty <= 0) continue;
        const id = printingId(entry);
        if (id) ids.add(id);
    }
    return [...ids];
}
