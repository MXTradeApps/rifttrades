import { FreeLimits } from './freeLimits.js';

const TRADE_BINDER_ID = 'system:trade';

function resolvedBinderId(entry) {
    return entry?.binderId || TRADE_BINDER_ID;
}

/**
 * Distinct owned printing ids across Binders (Want List excluded).
 *
 * @param {Array<{ isWanted?: boolean, cardId?: string, printingId?: string, quantity?: number }>} entries
 * @returns {number}
 */
export function distinctOwnedCount(entries) {
    const ids = new Set();
    for (const entry of entries || []) {
        if (entry?.isWanted) continue;
        if ((Number(entry.quantity) || 0) <= 0) continue;
        const id = entry.printingId || entry.cardId;
        if (id) ids.add(id);
    }
    return ids.size;
}

/**
 * Move copies of a Printing+condition between live Binders.
 * Golden cases: tests/fixtures/binder_move.json
 *
 * Unlike FAB, a free destination at `freeBinderCardsCap` distinct Printings
 * refuses a new Printing (`binder-cards-cap`). Quantity-only merge of a
 * Printing already in the destination is allowed. Pro ignores the cap.
 * Want List is never a destination.
 *
 * @returns {{ ok: boolean, reason: string|null, entries: Array, distinctOwned: number }}
 */
export function moveBinderCopies({
    binders,
    entries,
    fromBinderId,
    toBinderId,
    printingId,
    condition = 'NM',
    quantity,
    isPro = false,
    freeBinderCardsCap = FreeLimits.binderCards,
}) {
    const snapshot = (entries || []).map((e) => ({ ...e }));
    const owned = () => distinctOwnedCount(snapshot);
    const refuse = (reason) => ({
        ok: false,
        reason,
        entries: snapshot,
        distinctOwned: owned(),
    });

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 1) return refuse('invalid-quantity');
    if (fromBinderId === toBinderId) return refuse('same-binder');
    if (!toBinderId || toBinderId === 'want') return refuse('invalid-destination');

    const dest = (binders || []).find((b) => b.clientId === toBinderId);
    if (!dest || dest.deletedAt) return refuse('invalid-destination');

    const srcIdx = snapshot.findIndex((e) =>
        !e.isWanted &&
        (e.printingId || e.cardId) === printingId &&
        resolvedBinderId(e) === fromBinderId &&
        (e.condition || 'NM') === condition,
    );
    if (srcIdx < 0) return refuse('missing-source');
    const source = snapshot[srcIdx];
    if (qty > (Number(source.quantity) || 0)) return refuse('invalid-quantity');

    if (!isPro) {
        const destIds = new Set();
        for (const e of snapshot) {
            if (e.isWanted) continue;
            if (resolvedBinderId(e) !== toBinderId) continue;
            if ((Number(e.quantity) || 0) <= 0) continue;
            const id = e.printingId || e.cardId;
            if (id) destIds.add(id);
        }
        const cap = Number(freeBinderCardsCap) || FreeLimits.binderCards;
        if (!destIds.has(printingId) && destIds.size >= cap) {
            return refuse('binder-cards-cap');
        }
    }

    const remaining = (Number(source.quantity) || 0) - qty;
    if (remaining <= 0) snapshot.splice(srcIdx, 1);
    else snapshot[srcIdx] = {
        ...source,
        quantity: remaining,
        binderId: resolvedBinderId(source),
    };

    const destIdx = snapshot.findIndex((e) =>
        !e.isWanted &&
        (e.printingId || e.cardId) === printingId &&
        resolvedBinderId(e) === toBinderId &&
        (e.condition || 'NM') === condition,
    );
    if (destIdx >= 0) {
        snapshot[destIdx] = {
            ...snapshot[destIdx],
            quantity: (Number(snapshot[destIdx].quantity) || 0) + qty,
        };
    } else {
        snapshot.push({
            ...source,
            binderId: toBinderId,
            isWanted: false,
            quantity: qty,
            condition,
            printingId: source.printingId || source.cardId || printingId,
            cardId: source.cardId || source.printingId || printingId,
        });
    }

    return {
        ok: true,
        reason: null,
        entries: snapshot,
        distinctOwned: distinctOwnedCount(snapshot),
    };
}
