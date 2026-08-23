import {
    reconcileBinderAfterTrade,
    tradeLinesFromList,
} from '../../src/utils/confirmTrade.js';

const binder = (cardId, quantity, { wanted = false, condition = 'NM' } = {}) => ({
    cardId,
    quantity,
    isWanted: wanted,
    condition,
    card: { id: cardId, name: cardId },
    addedAt: '2026-07-01T00:00:00.000Z',
});

describe('reconcileBinderAfterTrade', () => {
    const now = '2026-07-01T00:00:00.000Z';

    test('decrements given cards and clamps at zero', () => {
        const next = reconcileBinderAfterTrade({
            entries: [binder('a', 1)],
            haveItems: [{ cardId: 'a', quantity: 3 }],
            wantItems: [],
            removeGivenFromBinder: true,
            addReceivedToBinder: false,
            now,
        });
        expect(next).toEqual([]);
    });

    test('adds received cards to Trade Binder as NM (does not merge into LP)', () => {
        const next = reconcileBinderAfterTrade({
            entries: [binder('b', 1, { condition: 'LP' })],
            haveItems: [],
            wantItems: [{ cardId: 'b', quantity: 2, card: { _uniqueId: 'b', name: 'B' } }],
            removeGivenFromBinder: false,
            addReceivedToBinder: true,
            now,
        });
        expect(next).toHaveLength(2);
        const lp = next.find((e) => e.condition === 'LP');
        const nm = next.find((e) => e.condition === 'NM');
        expect(lp.quantity).toBe(1);
        expect(nm.quantity).toBe(2);
        expect(nm.binderId).toBe('system:trade');
        expect(nm.isWanted).toBe(false);
    });

    test('creates new NM Trade Binder row for received cards', () => {
        const next = reconcileBinderAfterTrade({
            entries: [],
            haveItems: [],
            wantItems: [{ cardId: 'c', quantity: 1, card: { _uniqueId: 'c', name: 'C' } }],
            removeGivenFromBinder: false,
            addReceivedToBinder: true,
            now,
        });
        expect(next).toHaveLength(1);
        expect(next[0]).toMatchObject({
            cardId: 'c',
            quantity: 1,
            condition: 'NM',
            isWanted: false,
            binderId: 'system:trade',
        });
    });

    test('leaves Collection rows untouched', () => {
        const next = reconcileBinderAfterTrade({
            entries: [
                { ...binder('a', 4), binderId: 'system:collection' },
                { ...binder('a', 2), binderId: 'system:trade' },
            ],
            haveItems: [{ cardId: 'a', quantity: 1 }],
            wantItems: [{ cardId: 'c', quantity: 1, card: { _uniqueId: 'c', name: 'C' } }],
            removeGivenFromBinder: true,
            addReceivedToBinder: true,
            now,
        });
        const collection = next.find((e) => e.binderId === 'system:collection');
        expect(collection).toMatchObject({ cardId: 'a', quantity: 4 });
        const trade = next.find((e) => e.cardId === 'a' && (e.binderId || 'system:trade') === 'system:trade');
        expect(trade.quantity).toBe(1);
        const received = next.find((e) => e.cardId === 'c');
        expect(received.binderId).toBe('system:trade');
    });

    test('clears received cards from want list even when add is off', () => {
        const next = reconcileBinderAfterTrade({
            entries: [binder('c', 2, { wanted: true })],
            haveItems: [],
            wantItems: [{ cardId: 'c', quantity: 1 }],
            removeGivenFromBinder: false,
            addReceivedToBinder: false,
            now,
        });
        expect(next).toHaveLength(1);
        expect(next[0].quantity).toBe(1);
        expect(next[0].isWanted).toBe(true);
    });

    test('skips binder mutations when both checkboxes are off but still clears wants', () => {
        const start = [binder('g', 5), binder('r', 1, { wanted: true })];
        const next = reconcileBinderAfterTrade({
            entries: start,
            haveItems: [{ cardId: 'g', quantity: 1 }],
            wantItems: [{ cardId: 'r', quantity: 1 }],
            removeGivenFromBinder: false,
            addReceivedToBinder: false,
            now,
        });
        expect(next.find((e) => e.cardId === 'g').quantity).toBe(5);
        expect(next.find((e) => e.cardId === 'r')).toBeUndefined();
    });
});

describe('tradeLinesFromList', () => {
    test('maps uniqueId and quantity', () => {
        expect(
            tradeLinesFromList([
                { uniqueId: 'a-normal', name: 'A', quantity: 2, price: 10 },
                { name: 'No id', quantity: 1 },
            ]),
        ).toEqual([
            {
                cardId: 'a-normal',
                quantity: 2,
                card: expect.objectContaining({
                    _uniqueId: 'a-normal',
                    name: 'A',
                    marketPrice: 10,
                }),
            },
        ]);
    });
});
