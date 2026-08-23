jest.mock('../../src/lib/supabase.js', () => {
    const auth = { getUser: jest.fn() };
    const supabase = { auth, from: jest.fn(), rpc: jest.fn() };
    return { supabase };
});

jest.mock('../../src/services/entitlements.js', () => ({
    fetchEntitlement: jest.fn(),
}));

import { supabase } from '../../src/lib/supabase.js';
import { fetchEntitlement } from '../../src/services/entitlements.js';
import {
    BINDER_CONDITIONS,
    COLLECTION_BINDER_ID,
    TRADE_BINDER_ID,
    applyBinderMove,
    binderShareUrl,
    cardStub,
    checkCanAddBinderCard,
    createBinder,
    deleteBinder,
    entryClientId,
    ensureBinderShare,
    filterTradeBinderEntries,
    getBinderEntries,
    getBinders,
    getPublicBinder,
    newBinderShareToken,
    parseCardStub,
    removeEntry,
    renameBinder,
    upsertEntry,
} from '../../src/services/binder.js';

const defaultBinderRows = [
    {
        client_id: TRADE_BINDER_ID,
        name: 'Trade Binder',
        role: 'trade',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        deleted_at: null,
    },
    {
        client_id: COLLECTION_BINDER_ID,
        name: 'Collection',
        role: 'standard',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        deleted_at: null,
    },
];

const mockFromByTable = ({ entries, binders = defaultBinderRows }) => {
    const entriesChain = makeChain({ data: entries, error: null });
    const bindersChain = makeChain({ data: binders, error: null });
    supabase.from.mockImplementation((table) => (
        table === 'rift_binders' ? bindersChain : entriesChain
    ));
    return { entriesChain, bindersChain };
};

const makeChain = (result) => {
    const chain = {
        then: (resolve) => resolve(result),
    };
    const methods = [
        'insert',
        'select',
        'single',
        'maybeSingle',
        'eq',
        'in',
        'is',
        'order',
        'update',
        'delete',
        'upsert',
    ];
    for (const method of methods) {
        chain[method] = jest.fn(() => chain);
    }
    return chain;
};

const asUser = (id = 'user-1') =>
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id } } });
const asAnonymous = () =>
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

const webCard = {
    _uniqueId: 'og-001-foil',
    productId: '12345',
    name: 'Kai',
    _setName: 'Origins',
    subTypeName: 'Foil',
    rarity: 'Legendary',
    number: 'OG-001',
    imageUrl: 'https://example.com/kai.webp',
    marketPrice: 12.5,
    lowPrice: 9,
    cardmarketTrend: 11,
    cardmarketLow: 8,
};

describe('cardStub / parseCardStub', () => {
    test('writes the mobile snake_case stub keys', () => {
        const stub = cardStub(webCard);
        expect(Object.keys(stub).sort()).toEqual([
            'cm_low',
            'cm_trend',
            'collector_number',
            'id',
            'image_url',
            'is_foil',
            'name',
            'product_id',
            'rarity',
            'set_name',
            'sub_type_name',
            'tcg_low',
            'tcg_market',
        ].sort());
        expect(stub).toMatchObject({
            id: 'og-001-foil',
            product_id: 12345,
            name: 'Kai',
            set_name: 'Origins',
            sub_type_name: 'Foil',
            is_foil: true,
            rarity: 'Legendary',
            collector_number: 'OG-001',
            image_url: 'https://example.com/kai.webp',
            tcg_market: 12.5,
            tcg_low: 9,
            cm_trend: 11,
            cm_low: 8,
        });
        expect(stub.pitch).toBeUndefined();
        expect(stub.card_type).toBeUndefined();
        expect(stub.card_class).toBeUndefined();
    });

    test('round-trips through parseCardStub with mobile-expected keys preserved on re-stub', () => {
        const stub = cardStub(webCard);
        const parsed = parseCardStub(stub);
        expect(parsed).toMatchObject({
            id: 'og-001-foil',
            name: 'Kai',
            setName: 'Origins',
            subTypeName: 'Foil',
            isFoil: true,
            tcgMarket: 12.5,
            imageUrl: 'https://example.com/kai.webp',
        });
        expect(cardStub(stub).id).toBe('og-001-foil');
        expect(cardStub(stub).product_id).toBe(12345);
    });

    test('exposes the shared condition enum', () => {
        expect(BINDER_CONDITIONS).toEqual(['NM', 'LP', 'MP', 'HP', 'DMG']);
    });
});

describe('getBinderEntries', () => {
    test('errors when anonymous', async () => {
        asAnonymous();
        const { data, error } = await getBinderEntries();
        expect(data).toBeNull();
        expect(error.message).toMatch(/logged in/i);
    });

    test('splits binder vs wants and filters live rows only', async () => {
        asUser('user-42');
        const { entriesChain } = mockFromByTable({
            entries: [
                {
                    card_id: 'a',
                    is_wanted: false,
                    binder_id: TRADE_BINDER_ID,
                    client_id: 'binder|system:trade|a|LP',
                    quantity: 2,
                    condition: 'LP',
                    card: cardStub(webCard),
                    added_at: '2026-01-01T00:00:00.000Z',
                    updated_at: '2026-01-02T00:00:00.000Z',
                },
                {
                    card_id: 'b',
                    is_wanted: true,
                    binder_id: null,
                    client_id: 'want|b',
                    quantity: 1,
                    condition: 'NM',
                    card: {
                        id: 'b',
                        name: 'Wanted',
                        product_id: 1,
                        set_name: 'Set',
                        sub_type_name: null,
                        is_foil: false,
                        rarity: null,
                        collector_number: null,
                        image_url: null,
                        tcg_market: 1,
                        tcg_low: null,
                        cm_trend: null,
                        cm_low: null,
                    },
                    added_at: '2026-01-03T00:00:00.000Z',
                    updated_at: '2026-01-03T00:00:00.000Z',
                },
            ],
        });

        const { data, error } = await getBinderEntries();

        expect(error).toBeNull();
        expect(supabase.from).toHaveBeenCalledWith('rift_binder_entries');
        expect(supabase.from).toHaveBeenCalledWith('rift_binders');
        expect(entriesChain.eq).toHaveBeenCalledWith('user_id', 'user-42');
        expect(entriesChain.is).toHaveBeenCalledWith('deleted_at', null);
        expect(data.binder).toHaveLength(1);
        expect(data.wants).toHaveLength(1);
        expect(data.binder[0].card.name).toBe('Kai');
        expect(data.binder[0].binderId).toBe(TRADE_BINDER_ID);
        expect(data.wants[0].cardId).toBe('b');
        expect(data.wants[0].binderId).toBeNull();
        expect(data.binders.map((b) => b.clientId)).toEqual([
            TRADE_BINDER_ID,
            COLLECTION_BINDER_ID,
        ]);
    });
});

describe('getBinders', () => {
    test('errors when anonymous', async () => {
        asAnonymous();
        const { data, error } = await getBinders();
        expect(data).toBeNull();
        expect(error.message).toMatch(/logged in/i);
    });

    test('seeds Trade Binder and Collection when missing', async () => {
        asUser('user-1');
        const empty = makeChain({ data: [], error: null });
        const upserted = makeChain({
            data: defaultBinderRows.map((row) => ({ ...row, user_id: 'user-1' })),
            error: null,
        });
        supabase.from
            .mockReturnValueOnce(empty)
            .mockReturnValueOnce(upserted);

        const { data, error } = await getBinders();

        expect(error).toBeNull();
        expect(supabase.from).toHaveBeenCalledWith('rift_binders');
        expect(upserted.upsert).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    client_id: TRADE_BINDER_ID,
                    name: 'Trade Binder',
                    role: 'trade',
                }),
                expect.objectContaining({
                    client_id: COLLECTION_BINDER_ID,
                    name: 'Collection',
                    role: 'standard',
                }),
            ]),
            { onConflict: 'user_id,client_id' },
        );
        expect(data.binders.map((b) => b.clientId)).toEqual([
            TRADE_BINDER_ID,
            COLLECTION_BINDER_ID,
        ]);
    });

    test('Trade-only does not re-add Collection', async () => {
        asUser('user-1');
        const tradeOnly = defaultBinderRows.filter((r) => r.client_id === TRADE_BINDER_ID);
        const list = makeChain({ data: tradeOnly, error: null });
        supabase.from.mockReturnValue(list);

        const { data, error } = await getBinders();

        expect(error).toBeNull();
        expect(list.upsert).not.toHaveBeenCalled();
        expect(data.binders.map((b) => b.clientId)).toEqual([TRADE_BINDER_ID]);
    });

    test('tombstoned Collection is not resurrected', async () => {
        asUser('user-1');
        const rows = [
            ...defaultBinderRows.filter((r) => r.client_id === TRADE_BINDER_ID),
            {
                ...defaultBinderRows.find((r) => r.client_id === COLLECTION_BINDER_ID),
                deleted_at: '2026-06-01T00:00:00.000Z',
            },
        ];
        const list = makeChain({ data: rows, error: null });
        supabase.from.mockReturnValue(list);

        const { data, error } = await getBinders();

        expect(error).toBeNull();
        expect(list.upsert).not.toHaveBeenCalled();
        expect(data.binders.map((b) => b.clientId)).toEqual([TRADE_BINDER_ID]);
        expect(data.all.some((b) => b.clientId === COLLECTION_BINDER_ID && b.deletedAt)).toBe(true);
    });
});

describe('upsertEntry / removeEntry', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('upserts with client updated_at, cleared deleted_at, and mobile stub', async () => {
        asUser('user-7');
        const saved = {
            card_id: 'og-001-foil',
            is_wanted: false,
            quantity: 1,
            condition: 'NM',
            card: cardStub(webCard),
            added_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
        };
        const chain = makeChain({ data: saved, error: null });
        supabase.from.mockReturnValue(chain);

        const before = Date.now();
        const { data, error } = await upsertEntry({
            cardId: 'og-001-foil',
            isWanted: false,
            quantity: 1,
            condition: 'NM',
            card: webCard,
        });
        const after = Date.now();

        expect(error).toBeNull();
        expect(data.cardId).toBe('og-001-foil');
        expect(supabase.from).toHaveBeenCalledWith('rift_binder_entries');
        expect(chain.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'user-7',
                card_id: 'og-001-foil',
                is_wanted: false,
                binder_id: TRADE_BINDER_ID,
                client_id: 'binder|system:trade|og-001-foil|NM',
                quantity: 1,
                deleted_at: null,
                card: expect.objectContaining({
                    id: 'og-001-foil',
                    product_id: 12345,
                    set_name: 'Origins',
                }),
            }),
            { onConflict: 'user_id,client_id' },
        );
        const payload = chain.upsert.mock.calls[0][0];
        const updatedAt = Date.parse(payload.updated_at);
        expect(updatedAt).toBeGreaterThanOrEqual(before);
        expect(updatedAt).toBeLessThanOrEqual(after);
    });

    test('quantity <= 0 tombstones instead of upserting', async () => {
        asUser();
        const chain = makeChain({ data: null, error: null });
        supabase.from.mockReturnValue(chain);

        const { data, error } = await upsertEntry({
            cardId: 'og-001-foil',
            isWanted: true,
            quantity: 0,
            card: webCard,
        });

        expect(error).toBeNull();
        expect(data).toEqual({ success: true });
        expect(chain.update).toHaveBeenCalledWith(
            expect.objectContaining({
                deleted_at: expect.any(String),
                updated_at: expect.any(String),
            }),
        );
        expect(chain.eq).toHaveBeenCalledWith('client_id', 'want|og-001-foil');
        expect(chain.upsert).not.toHaveBeenCalled();
    });

    test('owned upsert identity includes binderId and condition', () => {
        expect(entryClientId({
            cardId: 'og-001-foil',
            isWanted: false,
            binderId: COLLECTION_BINDER_ID,
            condition: 'LP',
        })).toBe('binder|system:collection|og-001-foil|LP');
        expect(entryClientId({ cardId: 'og-001-foil', isWanted: true })).toBe(
            'want|og-001-foil',
        );
    });

    test('removeEntry sets deleted_at and updated_at together', async () => {
        asUser('user-9');
        const chain = makeChain({ data: null, error: null });
        supabase.from.mockReturnValue(chain);

        await removeEntry('card-1', false);

        const update = chain.update.mock.calls[0][0];
        expect(update.deleted_at).toBe(update.updated_at);
        expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-9');
    });
});

describe('checkCanAddBinderCard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('allows topping up an already-listed card even at the free cap', async () => {
        asUser();
        const { allowed } = await checkCanAddBinderCard({
            isWanted: false,
            existingDistinctCount: 50,
            alreadyListed: true,
        });
        expect(allowed).toBe(true);
        expect(fetchEntitlement).not.toHaveBeenCalled();
    });

    test('refuses a new binder card at the free cap', async () => {
        asUser('user-1');
        fetchEntitlement.mockResolvedValue({
            entitlement: { isPro: false },
        });
        const { allowed, isPro } = await checkCanAddBinderCard({
            isWanted: false,
            existingDistinctCount: 50,
            alreadyListed: false,
        });
        expect(allowed).toBe(false);
        expect(isPro).toBe(false);
        expect(fetchEntitlement).toHaveBeenCalledWith('user-1');
    });

    test('allows Pro past the free cap', async () => {
        asUser('user-1');
        fetchEntitlement.mockResolvedValue({
            entitlement: { isPro: true },
        });
        const { allowed } = await checkCanAddBinderCard({
            isWanted: true,
            existingDistinctCount: 40,
        });
        expect(allowed).toBe(true);
    });
});

describe('binder share helpers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('newBinderShareToken returns 32 hex chars', () => {
        const token = newBinderShareToken();
        expect(token).toMatch(/^[0-9a-f]{32}$/);
    });

    test('binderShareUrl builds /b/:token path', () => {
        expect(binderShareUrl('abc123def4567890', 'https://example.com')).toBe(
            'https://example.com/b/abc123def4567890',
        );
    });

    test('ensureBinderShare creates a row when none exists', async () => {
        asUser('user-share');
        const selectChain = makeChain({ data: null, error: null });
        const insertChain = makeChain({
            data: {
                token: 'a'.repeat(32),
                is_enabled: true,
                created_at: '2026-08-02T00:00:00.000Z',
                updated_at: '2026-08-02T00:00:00.000Z',
            },
            error: null,
        });
        supabase.from
            .mockReturnValueOnce(selectChain)
            .mockReturnValueOnce(insertChain);

        const { data, error } = await ensureBinderShare();

        expect(error).toBeNull();
        expect(supabase.from).toHaveBeenCalledWith('rift_binder_shares');
        expect(insertChain.insert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'user-share',
                is_enabled: true,
                token: expect.stringMatching(/^[0-9a-f]{32}$/),
            }),
        );
        expect(data.isEnabled).toBe(true);
        expect(data.url).toContain('/b/');
    });

    test('getPublicBinder maps RPC Trade Binder rows only and rejects short tokens', async () => {
        const short = await getPublicBinder('too-short');
        expect(short.data).toBeNull();
        expect(short.error.message).toMatch(/invalid/i);

        // get_rift_public_binder returns Trade Binder (role=trade) rows only.
        // Collection is excluded server-side. The mock is whatever we give it;
        // the client maps RPC entries as Trade Binder and does not re-add Collection.
        supabase.rpc.mockResolvedValue({
            data: {
                entries: [
                    {
                        card_id: 'og-001-foil',
                        quantity: 2,
                        condition: 'LP',
                        card: cardStub(webCard),
                        added_at: '2026-01-01T00:00:00.000Z',
                        updated_at: '2026-01-02T00:00:00.000Z',
                    },
                ],
            },
            error: null,
        });

        const { data, error } = await getPublicBinder('a'.repeat(32));
        expect(error).toBeNull();
        expect(supabase.rpc).toHaveBeenCalledWith('get_rift_public_binder', {
            p_token: 'a'.repeat(32),
        });
        expect(data.entries).toHaveLength(1);
        expect(data.entries[0]).toMatchObject({
            cardId: 'og-001-foil',
            quantity: 2,
            condition: 'LP',
            isWanted: false,
            binderId: TRADE_BINDER_ID,
        });
        expect(data.entries[0].card.name).toBe('Kai');
        expect(data.entries.every((e) => e.binderId === TRADE_BINDER_ID)).toBe(true);
        expect(supabase.from).not.toHaveBeenCalledWith('rift_binders');
    });

    test('filterTradeBinderEntries documents the role=trade filter', () => {
        const kept = filterTradeBinderEntries(
            [
                { cardId: 't', isWanted: false, binderId: TRADE_BINDER_ID },
                { cardId: 'c', isWanted: false, binderId: COLLECTION_BINDER_ID },
                { cardId: 'w', isWanted: true, binderId: null },
            ],
            [
                { clientId: TRADE_BINDER_ID, role: 'trade' },
                { clientId: COLLECTION_BINDER_ID, role: 'standard' },
            ],
        );
        expect(kept.map((e) => e.cardId)).toEqual(['t']);
    });

    test('getPublicBinder surfaces disabled/missing shares', async () => {
        supabase.rpc.mockResolvedValue({ data: null, error: null });
        const { data, error } = await getPublicBinder('b'.repeat(32));
        expect(data).toBeNull();
        expect(error.message).toMatch(/unavailable/i);
    });
});

describe('createBinder / renameBinder / deleteBinder', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fetchEntitlement.mockResolvedValue({ entitlement: { isPro: false } });
    });

    test('refuses an empty name and does not write', async () => {
        asUser();
        const { data, error } = await createBinder({ name: '   ', isPro: true });
        expect(data).toBeNull();
        expect(error.reason).toBe('empty');
        expect(supabase.from).not.toHaveBeenCalled();
    });

    test('refuses a duplicate live name', async () => {
        asUser();
        mockFromByTable({ entries: [] });
        const { data, error } = await createBinder({ name: 'collection', isPro: true });
        expect(data).toBeNull();
        expect(error.reason).toBe('duplicate');
    });

    test('paywall creates no 5th rift_binders row', async () => {
        asUser();
        const four = [
            ...defaultBinderRows,
            {
                client_id: 'b3',
                name: 'Third',
                role: 'standard',
                created_at: '2026-01-02T00:00:00.000Z',
                updated_at: '2026-01-02T00:00:00.000Z',
                deleted_at: null,
            },
            {
                client_id: 'b4',
                name: 'Fourth',
                role: 'standard',
                created_at: '2026-01-03T00:00:00.000Z',
                updated_at: '2026-01-03T00:00:00.000Z',
                deleted_at: null,
            },
        ];
        const { bindersChain } = mockFromByTable({ entries: [], binders: four });
        const { data, error } = await createBinder({ name: 'Fifth', isPro: false });
        expect(data).toBeNull();
        expect(error).toEqual(expect.objectContaining({ reason: 'paywall' }));
        expect(bindersChain.upsert).not.toHaveBeenCalled();
    });

    test('creates a user Binder on rift_binders', async () => {
        asUser('user-1');
        const listChain = makeChain({ data: defaultBinderRows, error: null });
        const upsertChain = makeChain({
            data: {
                user_id: 'user-1',
                client_id: 'uuid-1',
                name: 'Side Event',
                role: 'standard',
                created_at: '2026-01-04T00:00:00.000Z',
                updated_at: '2026-01-04T00:00:00.000Z',
                deleted_at: null,
            },
            error: null,
        });
        supabase.from.mockReturnValueOnce(listChain).mockReturnValueOnce(upsertChain);

        fetchEntitlement.mockResolvedValue({ entitlement: { isPro: true } });
        const { data, error } = await createBinder({ name: 'Side Event', isPro: true });

        expect(error).toBeNull();
        expect(data).toMatchObject({ name: 'Side Event', role: 'standard' });
        expect(supabase.from).toHaveBeenCalledWith('rift_binders');
        expect(upsertChain.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'user-1',
                name: 'Side Event',
                role: 'standard',
                deleted_at: null,
            }),
            { onConflict: 'user_id,client_id' },
        );
    });

    test('renames a live Binder', async () => {
        asUser('user-1');
        const listChain = makeChain({ data: defaultBinderRows, error: null });
        const updateChain = makeChain({
            data: { ...defaultBinderRows[1], name: 'My Collection' },
            error: null,
        });
        supabase.from.mockReturnValueOnce(listChain).mockReturnValueOnce(updateChain);

        const { data, error } = await renameBinder({
            clientId: COLLECTION_BINDER_ID,
            name: 'My Collection',
        });

        expect(error).toBeNull();
        expect(data.name).toBe('My Collection');
        expect(updateChain.update).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'My Collection' }),
        );
        expect(updateChain.eq).toHaveBeenCalledWith('client_id', COLLECTION_BINDER_ID);
    });

    test('refuses deleting Trade Binder', async () => {
        asUser();
        const { data, error } = await deleteBinder({
            clientId: TRADE_BINDER_ID,
            entries: [],
        });
        expect(data).toBeNull();
        expect(error.reason).toBe('trade');
        expect(supabase.from).not.toHaveBeenCalled();
    });

    test('refuses deleting a non-empty Binder', async () => {
        asUser();
        const { data, error } = await deleteBinder({
            clientId: COLLECTION_BINDER_ID,
            entries: [{
                isWanted: false,
                binderId: COLLECTION_BINDER_ID,
                quantity: 1,
            }],
        });
        expect(data).toBeNull();
        expect(error.reason).toBe('not-empty');
        expect(supabase.from).not.toHaveBeenCalled();
    });

    test('tombstones an empty Binder', async () => {
        asUser('user-1');
        const { bindersChain } = mockFromByTable({ entries: [] });

        const { error } = await deleteBinder({
            clientId: COLLECTION_BINDER_ID,
            entries: [],
        });

        expect(error).toBeNull();
        expect(supabase.from).toHaveBeenCalledWith('rift_binders');
        expect(bindersChain.update).toHaveBeenCalledWith(
            expect.objectContaining({
                deleted_at: expect.any(String),
                updated_at: expect.any(String),
            }),
        );
        expect(bindersChain.eq).toHaveBeenCalledWith('client_id', COLLECTION_BINDER_ID);
    });
});

describe('applyBinderMove', () => {
    const binders = [
        { clientId: TRADE_BINDER_ID, role: 'trade', deletedAt: null },
        { clientId: COLLECTION_BINDER_ID, role: 'standard', deletedAt: null },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        fetchEntitlement.mockResolvedValue({ entitlement: { isPro: false } });
    });

    test('updates source and upserts dest on a partial move', async () => {
        asUser('user-1');
        const saved = {
            card_id: 'og-001-foil',
            is_wanted: false,
            quantity: 1,
            condition: 'NM',
            binder_id: TRADE_BINDER_ID,
            client_id: 'binder|system:trade|og-001-foil|NM',
            card: cardStub(webCard),
            added_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
        };
        const chain = makeChain({ data: saved, error: null });
        supabase.from.mockReturnValue(chain);

        const { error } = await applyBinderMove({
            binders,
            entries: [{
                cardId: 'og-001-foil',
                isWanted: false,
                binderId: TRADE_BINDER_ID,
                quantity: 3,
                condition: 'NM',
                card: webCard,
            }],
            fromBinderId: TRADE_BINDER_ID,
            toBinderId: COLLECTION_BINDER_ID,
            printingId: 'og-001-foil',
            condition: 'NM',
            quantity: 2,
            isPro: true,
        });

        expect(error).toBeNull();
        expect(supabase.from).toHaveBeenCalledWith('rift_binder_entries');
        expect(chain.upsert).toHaveBeenCalledTimes(2);
        expect(chain.upsert.mock.calls[0][0]).toEqual(expect.objectContaining({
            client_id: 'binder|system:collection|og-001-foil|NM',
            quantity: 2,
            binder_id: COLLECTION_BINDER_ID,
        }));
        expect(chain.upsert.mock.calls[1][0]).toEqual(expect.objectContaining({
            client_id: 'binder|system:trade|og-001-foil|NM',
            quantity: 1,
            binder_id: TRADE_BINDER_ID,
        }));
        expect(chain.upsert.mock.calls[0][1]).toEqual({ onConflict: 'user_id,client_id' });
        expect(chain.upsert.mock.calls[1][1]).toEqual({ onConflict: 'user_id,client_id' });
    });

    test('deletes the source row when remaining quantity is 0', async () => {
        asUser('user-1');
        const saved = {
            card_id: 'og-001-foil',
            is_wanted: false,
            quantity: 3,
            condition: 'NM',
            binder_id: COLLECTION_BINDER_ID,
            client_id: 'binder|system:collection|og-001-foil|NM',
            card: cardStub(webCard),
            added_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
        };
        const chain = makeChain({ data: saved, error: null });
        supabase.from.mockReturnValue(chain);

        const { error } = await applyBinderMove({
            binders,
            entries: [{
                cardId: 'og-001-foil',
                isWanted: false,
                binderId: TRADE_BINDER_ID,
                quantity: 3,
                condition: 'NM',
                card: webCard,
            }],
            fromBinderId: TRADE_BINDER_ID,
            toBinderId: COLLECTION_BINDER_ID,
            printingId: 'og-001-foil',
            condition: 'NM',
            quantity: 3,
            isPro: true,
        });

        expect(error).toBeNull();
        expect(chain.update).toHaveBeenCalledWith(
            expect.objectContaining({
                deleted_at: expect.any(String),
                updated_at: expect.any(String),
            }),
        );
        expect(chain.eq).toHaveBeenCalledWith(
            'client_id',
            'binder|system:trade|og-001-foil|NM',
        );
        expect(chain.upsert).toHaveBeenCalledTimes(1);
        expect(chain.upsert.mock.calls[0][0]).toEqual(expect.objectContaining({
            client_id: 'binder|system:collection|og-001-foil|NM',
            quantity: 3,
        }));
    });

    test('refuses a new Printing when the free destination is at the cap', async () => {
        asUser();
        const chain = makeChain({ data: null, error: null });
        supabase.from.mockReturnValue(chain);
        const destEntries = Array.from({ length: 50 }, (_, i) => ({
            cardId: `c${i}`,
            isWanted: false,
            binderId: COLLECTION_BINDER_ID,
            quantity: 1,
            condition: 'NM',
        }));

        const { data, error } = await applyBinderMove({
            binders,
            entries: [
                ...destEntries,
                {
                    cardId: 'new-print',
                    isWanted: false,
                    binderId: TRADE_BINDER_ID,
                    quantity: 1,
                    condition: 'NM',
                    card: webCard,
                },
            ],
            fromBinderId: TRADE_BINDER_ID,
            toBinderId: COLLECTION_BINDER_ID,
            printingId: 'new-print',
            condition: 'NM',
            quantity: 1,
            isPro: false,
        });

        expect(data).toBeNull();
        expect(error.reason).toBe('binder-cards-cap');
        expect(chain.upsert).not.toHaveBeenCalled();
        expect(chain.update).not.toHaveBeenCalled();
    });
});
