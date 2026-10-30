import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { loadTradeDraft, TRADE_DRAFT_KEY } from '../../src/utils/tradeDraft.js';
import BinderCollection from '../../src/pages/BinderCollection.jsx';
import { ThemeModeProvider } from '../../src/contexts/ThemeContext.jsx';
import { pricedPrinting, unpricedPrinting } from '../fixtures/printings.js';

const mockGetBinderEntries = jest.fn();
const mockGetBinders = jest.fn();
const mockUpsertEntry = jest.fn();
const mockCreateBinder = jest.fn();
const mockRenameBinder = jest.fn();
const mockDeleteBinder = jest.fn();
const mockApplyBinderMove = jest.fn();
const mockRemoveEntry = jest.fn();
const mockEnsureBinderShare = jest.fn();

let mockUser = { id: 'user-1' };

jest.mock('../../src/contexts/AuthContext.jsx', () => ({
    useAuth: () => ({ user: mockUser }),
}));

jest.mock('../../src/contexts/AuthContext', () => ({
    useAuth: () => ({ user: mockUser }),
}));

jest.mock('../../src/contexts/EntitlementContext.jsx', () => ({
    useEntitlement: () => ({ isPro: false, loading: false }),
}));

jest.mock('../../src/hooks/useCardData.jsx', () => {
    const { pricedPrinting: priced, unpricedPrinting: unpriced } = require('../fixtures/printings.js');
    return {
        useCardData: () => ({
            cards: [priced, unpriced],
            cardGroups: [],
            pricesUpdatedAt: '2026-08-14T12:00:00Z',
            metadata: { lastUpdated: '2026-08-14T12:00:00Z' },
        }),
    };
});

jest.mock('../../src/contexts/CardDetailContext.jsx', () => ({
    useCardDetail: () => ({ openDetail: jest.fn() }),
}));

jest.mock('../../src/lib/analytics.js', () => ({
    capture: jest.fn(),
}));

jest.mock('../../src/services/binder.js', () => ({
    TRADE_BINDER_ID: 'system:trade',
    COLLECTION_BINDER_ID: 'system:collection',
    gridOrderBinders: (binders) => {
        const live = (binders || []).filter((b) => !b.deletedAt);
        const trade = live.find((b) => b.role === 'trade');
        const collection = live.find((b) => b.clientId === 'system:collection');
        const rest = live.filter((b) => b !== trade && b !== collection);
        return [...(trade ? [trade] : []), ...(collection ? [collection] : []), ...rest];
    },
    getBinderEntries: (...args) => mockGetBinderEntries(...args),
    getBinders: (...args) => mockGetBinders(...args),
    upsertEntry: (...args) => mockUpsertEntry(...args),
    removeEntry: (...args) => mockRemoveEntry(...args),
    ensureBinderShare: (...args) => mockEnsureBinderShare(...args),
    regenerateBinderShare: jest.fn(),
    setBinderShareEnabled: jest.fn(),
    createBinder: (...args) => mockCreateBinder(...args),
    renameBinder: (...args) => mockRenameBinder(...args),
    deleteBinder: (...args) => mockDeleteBinder(...args),
    applyBinderMove: (...args) => mockApplyBinderMove(...args),
    entryRowKey: (entry) => entry?.isWanted
        ? `want|${entry.cardId}`
        : `${entry?.binderId || 'system:trade'}|${entry?.cardId}|${entry?.condition || 'NM'}`,
}));

jest.mock('../../src/components/search/index.js', () => ({
    SearchInput: () => <div data-testid="search-input" />,
}));

jest.mock('../../src/components/auth/SignInDialog.jsx', () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock('../../src/components/auth/LoginButton.jsx', () => ({
    __esModule: true,
    default: () => <button type="button">Sign in</button>,
}));

const defaultBinders = {
    data: {
        binders: [
            { clientId: 'system:trade', name: 'Trade Binder', role: 'trade', deletedAt: null },
            { clientId: 'system:collection', name: 'Collection', role: 'standard', deletedAt: null },
        ],
        all: [
            { clientId: 'system:trade', name: 'Trade Binder', role: 'trade', deletedAt: null },
            { clientId: 'system:collection', name: 'Collection', role: 'standard', deletedAt: null },
        ],
    },
    error: null,
};

const renderCollection = (isWanted = false, { path = '/binder' } = {}) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <ThemeProvider theme={createTheme()}>
                <ThemeModeProvider>
                    <BinderCollection isWanted={isWanted} />
                </ThemeModeProvider>
            </ThemeProvider>
        </MemoryRouter>,
    );

describe('BinderGrid', () => {
    beforeEach(() => {
        mockUser = { id: 'user-1' };
        mockGetBinders.mockResolvedValue(defaultBinders);
        mockGetBinderEntries.mockResolvedValue({
            data: { binder: [], wants: [] },
            error: null,
        });
        mockUpsertEntry.mockResolvedValue({ data: {}, error: null });
        mockCreateBinder.mockResolvedValue({
            data: { clientId: 'side', name: 'Side Event', role: 'standard', deletedAt: null },
            error: null,
        });
        mockRenameBinder.mockResolvedValue({ data: {}, error: { reason: 'duplicate' } });
        mockDeleteBinder.mockResolvedValue({ data: null, error: { reason: 'not-empty' } });
        mockApplyBinderMove.mockResolvedValue({ data: {}, error: null });
    });

    test('signed-in /binder shows two tiles and drill-in/back', async () => {
        mockGetBinderEntries.mockResolvedValue({
            data: {
                binder: [
                    {
                        cardId: pricedPrinting._uniqueId,
                        quantity: 1,
                        isWanted: false,
                        binderId: 'system:trade',
                        card: pricedPrinting,
                    },
                ],
                wants: [],
            },
            error: null,
        });
        renderCollection(false);
        expect(await screen.findByTestId('binder-grid')).toBeInTheDocument();
        expect(await screen.findByTestId('binder-tile-system:trade')).toBeInTheDocument();
        expect(screen.getByTestId('binder-tile-system:collection')).toBeInTheDocument();
        expect(screen.queryByTestId('binder-tile-want')).not.toBeInTheDocument();

        fireEvent.click(screen.getByTestId('binder-tile-system:trade'));
        expect(await screen.findByTestId('binder-value-total')).toBeInTheDocument();
        expect(screen.queryByTestId('binder-grid')).not.toBeInTheDocument();
        expect(screen.getByTestId('binder-home-title')).toHaveTextContent('My Binders');
        expect(screen.getByTestId('binder-open-name')).toHaveTextContent('Trade Binder');

        fireEvent.click(screen.getByTestId('binder-back'));
        expect(await screen.findByTestId('binder-grid')).toBeInTheDocument();
    });

    test('/wants is the Want List, not a Binder grid', async () => {
        mockGetBinderEntries.mockResolvedValue({
            data: {
                binder: [],
                wants: [
                    {
                        cardId: pricedPrinting._uniqueId,
                        quantity: 1,
                        isWanted: true,
                        card: pricedPrinting,
                    },
                ],
            },
            error: null,
        });
        renderCollection(true, { path: '/wants' });
        await waitFor(() => screen.getByRole('heading', { name: 'Want List' }));
        expect(screen.queryByTestId('binder-grid')).not.toBeInTheDocument();
        expect(screen.queryByTestId('binder-tile-system:trade')).not.toBeInTheDocument();
        expect(screen.queryByTestId(`binder-move-${pricedPrinting._uniqueId}`)).not.toBeInTheDocument();
        expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });

    test('does not render a local grid when signed out', async () => {
        mockUser = null;
        renderCollection(false);
        expect(await screen.findByText('Sign In Required')).toBeInTheDocument();
        expect(screen.queryByTestId('binder-grid')).not.toBeInTheDocument();
        expect(mockGetBinders).not.toHaveBeenCalled();
    });

    test('My Binders heading and nav return to the grid from a drill-in', async () => {
        mockGetBinderEntries.mockResolvedValue({
            data: {
                binder: [
                    {
                        cardId: pricedPrinting._uniqueId,
                        quantity: 1,
                        isWanted: false,
                        binderId: 'system:trade',
                        card: pricedPrinting,
                    },
                ],
                wants: [],
            },
            error: null,
        });
        renderCollection(false);
        expect(await screen.findByTestId('binder-home-title')).toHaveTextContent('My Binders');
        fireEvent.click(await screen.findByTestId('binder-tile-system:trade'));
        expect(await screen.findByTestId('binder-value-total')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('binder-home-title'));
        expect(await screen.findByTestId('binder-grid')).toBeInTheDocument();

        fireEvent.click(await screen.findByTestId('binder-tile-system:trade'));
        expect(await screen.findByTestId('binder-value-total')).toBeInTheDocument();
        fireEvent.click(screen.getAllByRole('link', { name: /My Binders/i })[0]);
        expect(await screen.findByTestId('binder-grid')).toBeInTheDocument();
    });

    test('non-empty tile cover uses catalog art and falls back when the primary image 404s', async () => {
        mockGetBinderEntries.mockResolvedValue({
            data: {
                binder: [
                    {
                        cardId: pricedPrinting._uniqueId,
                        quantity: 1,
                        isWanted: false,
                        binderId: 'system:trade',
                        card: pricedPrinting,
                    },
                ],
                wants: [],
            },
            error: null,
        });
        renderCollection(false);
        const cover = await screen.findByTestId('binder-tile-cover-system:trade');
        expect(cover.tagName).toBe('IMG');
        expect(cover).toHaveAttribute('src', pricedPrinting.imageUrl);
        fireEvent.error(cover);
        expect(cover).toHaveAttribute('src', pricedPrinting.imageUrlFallback);
    });

    test('empty tiles show 0 and true-zero value; unpriced non-empty is a dash', async () => {
        mockGetBinderEntries.mockResolvedValue({
            data: {
                binder: [
                    {
                        cardId: unpricedPrinting._uniqueId,
                        quantity: 1,
                        isWanted: false,
                        binderId: 'system:collection',
                        card: unpricedPrinting,
                    },
                ],
                wants: [],
            },
            error: null,
        });
        renderCollection(false);
        expect(await screen.findByTestId('binder-tile-count-system:trade')).toHaveTextContent('0');
        expect(screen.getByTestId('binder-tile-value-system:trade')).toHaveTextContent('$0.00');
        expect(screen.queryByTestId('binder-tile-cover-system:trade')).not.toBeInTheDocument();
        expect(screen.getByTestId('binder-tile-count-system:collection')).toHaveTextContent('1');
        expect(screen.getByTestId('binder-tile-value-system:collection')).toHaveTextContent('—');
        expect(screen.getByTestId('binder-tile-cover-system:collection')).toBeInTheDocument();
    });

    test('Want List cards do not change Binder tile count or value', async () => {
        mockGetBinderEntries.mockResolvedValue({
            data: {
                binder: [],
                wants: [
                    {
                        cardId: pricedPrinting._uniqueId,
                        quantity: 4,
                        isWanted: true,
                        card: pricedPrinting,
                    },
                ],
            },
            error: null,
        });
        renderCollection(false);
        expect(await screen.findByTestId('binder-tile-count-system:trade')).toHaveTextContent('0');
        expect(screen.getByTestId('binder-tile-value-system:trade')).toHaveTextContent('$0.00');
        expect(screen.getByTestId('binder-tile-count-system:collection')).toHaveTextContent('0');
        expect(screen.queryByTestId('binder-tile-want')).not.toBeInTheDocument();
    });

    test('moves copies from Trade Binder to Collection', async () => {
        mockGetBinderEntries.mockResolvedValue({
            data: {
                binder: [
                    {
                        cardId: pricedPrinting._uniqueId,
                        quantity: 3,
                        isWanted: false,
                        binderId: 'system:trade',
                        condition: 'NM',
                        card: pricedPrinting,
                    },
                ],
                wants: [],
            },
            error: null,
        });
        const prompt = jest.spyOn(window, 'prompt');
        prompt.mockReturnValueOnce('Collection').mockReturnValueOnce('2');
        renderCollection(false);
        fireEvent.click(await screen.findByTestId('binder-tile-system:trade'));
        fireEvent.click(await screen.findByTestId(`binder-move-${pricedPrinting._uniqueId}`));
        expect(mockApplyBinderMove).toHaveBeenCalledWith(expect.objectContaining({
            fromBinderId: 'system:trade',
            toBinderId: 'system:collection',
            quantity: 2,
            printingId: pricedPrinting._uniqueId,
            isPro: false,
        }));
        await waitFor(() => expect(mockGetBinderEntries.mock.calls.length).toBeGreaterThan(1));
        prompt.mockRestore();
    });

    test('surfaces a cap refuse when a move would add a new Printing', async () => {
        mockApplyBinderMove.mockResolvedValue({
            data: null,
            error: { reason: 'binder-cards-cap', message: 'binder-cards-cap' },
        });
        mockGetBinderEntries.mockResolvedValue({
            data: {
                binder: [
                    {
                        cardId: pricedPrinting._uniqueId,
                        quantity: 1,
                        isWanted: false,
                        binderId: 'system:trade',
                        condition: 'NM',
                        card: pricedPrinting,
                    },
                ],
                wants: [],
            },
            error: null,
        });
        const prompt = jest.spyOn(window, 'prompt').mockReturnValue('Collection');
        renderCollection(false);
        fireEvent.click(await screen.findByTestId('binder-tile-system:trade'));
        fireEvent.click(await screen.findByTestId(`binder-move-${pricedPrinting._uniqueId}`));
        expect(mockApplyBinderMove).toHaveBeenCalled();
        expect(await screen.findByText(/Subscribe in the RiftTrades app/)).toBeInTheDocument();
        prompt.mockRestore();
    });

    test('create, rename collision, and Trade Binder delete is hidden', async () => {
        const prompt = jest.spyOn(window, 'prompt').mockReturnValue('Side Event');
        renderCollection(false);
        fireEvent.click(await screen.findByTestId('binder-create'));
        await waitFor(() => expect(mockCreateBinder).toHaveBeenCalled());
        expect(await screen.findByText('Side Event')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('binder-tile-menu-system:collection'));
        fireEvent.click(screen.getByText('Rename'));
        expect(await screen.findByText('A Binder with that name already exists')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('binder-tile-menu-system:collection'));
        fireEvent.click(screen.getByTestId('binder-delete-system:collection'));
        expect(await screen.findByText('Move or remove cards before deleting this Binder')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('binder-tile-menu-system:trade'));
        expect(screen.queryByTestId('binder-delete-system:trade')).not.toBeInTheDocument();
        prompt.mockRestore();
    });

    test('5th Binder on free shows subscribe CTA and does not create', async () => {
        const four = [
            { clientId: 'system:trade', name: 'Trade Binder', role: 'trade', deletedAt: null },
            { clientId: 'system:collection', name: 'Collection', role: 'standard', deletedAt: null },
            { clientId: 'b3', name: 'Third', role: 'standard', deletedAt: null },
            { clientId: 'b4', name: 'Fourth', role: 'standard', deletedAt: null },
        ];
        mockGetBinders.mockResolvedValue({ data: { binders: four, all: four }, error: null });
        renderCollection(false);
        expect(await screen.findByText('Fourth')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('binder-create'));
        expect(await screen.findByText(/Subscribe in the RiftTrades app/)).toBeInTheDocument();
        expect(mockCreateBinder).not.toHaveBeenCalled();
    });

    test('Post for sale formats the open Binder for Discord and Facebook', async () => {
        const writeText = jest.fn().mockResolvedValue(undefined);
        Object.assign(navigator, { clipboard: { writeText } });
        mockEnsureBinderShare.mockResolvedValue({
            data: { url: 'https://riftrades.com/b/tok', isEnabled: true },
            error: null,
        });
        mockGetBinderEntries.mockResolvedValue({
            data: {
                binder: [
                    {
                        cardId: pricedPrinting._uniqueId,
                        quantity: 3,
                        isWanted: false,
                        binderId: 'system:trade',
                        condition: 'LP',
                        card: pricedPrinting,
                    },
                ],
                wants: [],
            },
            error: null,
        });
        renderCollection(false);
        fireEvent.click(await screen.findByTestId('binder-tile-system:trade'));
        fireEvent.click(await screen.findByTestId('binder-sell'));

        const preview = await screen.findByTestId('sale-post-preview-0');
        expect(preview.textContent).toContain('**WTS** · prices are TCGplayer market');
        expect(preview.textContent).toContain('3x Void Seeker (LP) $13 ea');

        fireEvent.click(screen.getByTestId('sale-post-percent-80'));
        fireEvent.click(screen.getByTestId('sale-post-facebook'));
        expect(screen.getByTestId('sale-post-preview-0').textContent).toContain(
            '3x Void Seeker (LP) - $10 each',
        );

        fireEvent.click(screen.getByLabelText('Add a link to my Binder'));
        await waitFor(() =>
            expect(screen.getByTestId('sale-post-preview-0').textContent).toContain(
                'Full list: https://riftrades.com/b/tok',
            ),
        );

        fireEvent.click(screen.getByTestId('sale-post-copy-0'));
        await waitFor(() => expect(writeText).toHaveBeenCalled());
        expect(writeText.mock.calls[0][0]).toBe(screen.getByTestId('sale-post-preview-0').textContent);
        expect(await screen.findByText('Copied')).toBeInTheDocument();
    });

    test('multi-select posts only the selected cards and removes them in a batch', async () => {
        mockRemoveEntry.mockResolvedValue({ data: { success: true }, error: null });
        mockGetBinderEntries.mockResolvedValue({
            data: {
                binder: [
                    {
                        cardId: pricedPrinting._uniqueId,
                        quantity: 2,
                        isWanted: false,
                        binderId: 'system:trade',
                        condition: 'NM',
                        card: pricedPrinting,
                    },
                    {
                        cardId: unpricedPrinting._uniqueId,
                        quantity: 1,
                        isWanted: false,
                        binderId: 'system:trade',
                        condition: 'NM',
                        card: unpricedPrinting,
                    },
                ],
                wants: [],
            },
            error: null,
        });
        renderCollection(false);
        fireEvent.click(await screen.findByTestId('binder-tile-system:trade'));
        const selectPriced = await screen.findByLabelText(`Select ${pricedPrinting.name}`);
        expect(screen.queryByTestId('binder-selection-bar')).not.toBeInTheDocument();

        fireEvent.click(selectPriced);
        expect(screen.getByTestId('binder-selection-bar')).toHaveTextContent('1 selected');

        fireEvent.click(screen.getByTestId('binder-bulk-sell'));
        const preview = await screen.findByTestId('sale-post-preview-0');
        expect(preview.textContent).toContain('Void Seeker');
        expect(preview.textContent).not.toContain(unpricedPrinting.name);
        expect(preview.textContent).toContain('2 cards');
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));

        fireEvent.click(screen.getByTestId('binder-select-all'));
        expect(screen.getByTestId('binder-selection-bar')).toHaveTextContent('2 selected');
        fireEvent.click(screen.getByTestId('binder-bulk-remove'));
        fireEvent.click(await screen.findByTestId('binder-bulk-remove-confirm'));

        await waitFor(() => expect(mockRemoveEntry).toHaveBeenCalledTimes(2));
        expect(await screen.findByText('Removed 2 cards')).toBeInTheDocument();
        expect(screen.queryByLabelText(`Select ${pricedPrinting.name}`)).not.toBeInTheDocument();
        expect(screen.queryByTestId('binder-selection-bar')).not.toBeInTheDocument();
    });

    test('Add to trade appends Binder picks to Cards I Have and Want List picks to Cards I Want', async () => {
        localStorage.setItem(TRADE_DRAFT_KEY, JSON.stringify({
            v: 1,
            have: [{ uniqueId: 'already-here', name: 'Existing', subTypeName: 'Normal', quantity: 1, price: 1 }],
            want: [],
        }));
        const owned = {
            cardId: pricedPrinting._uniqueId,
            quantity: 3,
            isWanted: false,
            binderId: 'system:trade',
            condition: 'NM',
            card: pricedPrinting,
        };
        mockGetBinderEntries.mockResolvedValue({
            data: {
                binder: [owned],
                wants: [{ cardId: unpricedPrinting._uniqueId, quantity: 1, isWanted: true, card: unpricedPrinting }],
            },
            error: null,
        });

        const { unmount } = renderCollection(false);
        fireEvent.click(await screen.findByTestId('binder-tile-system:trade'));
        fireEvent.click(await screen.findByLabelText(`Select ${pricedPrinting.name}`));
        fireEvent.click(screen.getByTestId('binder-bulk-trade'));
        expect(await screen.findByText('Added 1 card to Cards I Have')).toBeInTheDocument();
        expect(screen.getByTestId('binder-trade-toast-view')).toBeInTheDocument();
        expect(screen.queryByTestId('binder-selection-bar')).not.toBeInTheDocument();
        unmount();

        renderCollection(true, { path: '/wants' });
        fireEvent.click(await screen.findByLabelText(`Select ${unpricedPrinting.name}`));
        fireEvent.click(screen.getByTestId('binder-bulk-trade'));
        expect(await screen.findByText('Added 1 card to Cards I Want')).toBeInTheDocument();

        const draft = loadTradeDraft();
        expect(draft.have.map((c) => c.uniqueId)).toEqual(['already-here', pricedPrinting._uniqueId]);
        expect(draft.have[1].quantity).toBe(1);
        expect(draft.want.map((c) => c.uniqueId)).toEqual([unpricedPrinting._uniqueId]);
        localStorage.removeItem(TRADE_DRAFT_KEY);
    });
});
