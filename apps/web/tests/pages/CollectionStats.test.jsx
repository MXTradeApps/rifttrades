import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CollectionStats from '../../src/pages/CollectionStats.jsx';
import { ThemeModeProvider } from '../../src/contexts/ThemeContext.jsx';
import { PriceProvider } from '../../src/contexts/PriceContext.jsx';
import { pricedPrinting, unpricedPrinting, otherCard } from '../fixtures/printings.js';
import { recentMovers } from '../../src/services/recentMovers.js';

const mockGetBinderEntries = jest.fn();
const mockGetBinders = jest.fn();
const mockOpenDetail = jest.fn();
let mockUser = { id: 'user-1' };

jest.mock('../../src/contexts/AuthContext', () => ({
    useAuth: () => ({ user: mockUser }),
}));

jest.mock('../../src/hooks/useCardData.jsx', () => {
    const { pricedPrinting: priced, unpricedPrinting: unpriced, otherCard: other } = require('../fixtures/printings.js');
    const cards = [priced, unpriced, other];
    return {
        useCardData: () => ({
            cards,
            cardIdLookup: Object.fromEntries(cards.map((c) => [c._uniqueId, c])),
            metadata: null,
        }),
    };
});

jest.mock('../../src/contexts/CardDetailContext.jsx', () => ({
    useCardDetail: () => ({ openDetail: mockOpenDetail }),
}));

jest.mock('../../src/services/binder.js', () => ({
    TRADE_BINDER_ID: 'system:trade',
    getBinderEntries: (...args) => mockGetBinderEntries(...args),
    getBinders: (...args) => mockGetBinders(...args),
}));

jest.mock('../../src/lib/supabase.js', () => ({ supabase: { rpc: jest.fn() } }));

jest.mock('../../src/services/recentMovers.js', () => {
    const actual = jest.requireActual('../../src/services/recentMovers.js');
    return { ...actual, recentMovers: jest.fn() };
});

jest.mock('../../src/components/elements/Header.jsx', () => () => (
    <div data-testid="header" />
));

jest.mock('../../src/components/auth/SignInDialog.jsx', () => ({
    __esModule: true,
    default: () => null,
}));

const binders = {
    data: {
        binders: [
            { clientId: 'system:trade', name: 'Trade Binder', role: 'trade', deletedAt: null },
            { clientId: 'system:collection', name: 'Collection', role: 'standard', deletedAt: null },
        ],
    },
    error: null,
};

const owned = (card, quantity = 1, binderId = 'system:trade') => ({
    cardId: card._uniqueId,
    quantity,
    isWanted: false,
    binderId,
    card,
});

const gainer = {
    direction: 'gainer',
    rank: 1,
    card_id: pricedPrinting._uniqueId,
    name: 'Void Seeker',
    set_name: 'Origins',
    finish: 'Normal',
    image_url: null,
    start_low: 8,
    start_on: '2026-10-11',
    latest_low: 12.5,
    percent_change: 0.5625,
    amount_change: 4.5,
};

const renderAt = (route) => render(
    <ThemeModeProvider>
        <PriceProvider>
            <MemoryRouter initialEntries={[route]}>
                <Routes>
                    <Route path="/binder" element={<div data-testid="binder-page" />} />
                    <Route path="/binder/stats" element={<CollectionStats />} />
                </Routes>
            </MemoryRouter>
        </PriceProvider>
    </ThemeModeProvider>,
);

describe('Collection Stats page', () => {
    beforeEach(() => {
        mockUser = { id: 'user-1' };
        mockOpenDetail.mockClear();
        recentMovers.mockReset();
        recentMovers.mockResolvedValue([gainer]);
        mockGetBinders.mockResolvedValue(binders);
        mockGetBinderEntries.mockResolvedValue({
            data: { binder: [owned(pricedPrinting)], wants: [] },
            error: null,
        });
    });

    test('headline shows Total Value in USD and Euro for the Binder in the URL', async () => {
        mockGetBinderEntries.mockResolvedValue({
            data: { binder: [owned(pricedPrinting, 2), owned(unpricedPrinting)], wants: [] },
            error: null,
        });
        renderAt('/binder/stats?b=system:trade');

        await waitFor(() => {
            expect(screen.getByTestId('collection-stats-headline')).toHaveTextContent('$25.00');
        });
        const headline = screen.getByTestId('collection-stats-headline');
        expect(headline).toHaveTextContent('Total Value');
        expect(headline).toHaveTextContent('€20.40');
        expect(screen.getByText('Trade Binder')).toBeInTheDocument();
        expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    });

    test('movers use this Binder ids only, show copies, and open details', async () => {
        mockGetBinderEntries.mockResolvedValue({
            data: {
                binder: [owned(pricedPrinting, 2), owned(otherCard, 1, 'system:collection')],
                wants: [owned({ ...unpricedPrinting }, 1)].map((e) => ({ ...e, isWanted: true })),
            },
            error: null,
        });
        renderAt('/binder/stats?b=system:trade');

        expect((await screen.findAllByText('Void Seeker')).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/2 copies/).length).toBeGreaterThan(0);
        expect(screen.getByText('Gainers')).toBeInTheDocument();
        expect(recentMovers).toHaveBeenCalledWith('tcgplayer', [pricedPrinting._uniqueId]);

        fireEvent.click(screen.getAllByText('Void Seeker')[0]);
        expect(mockOpenDetail).toHaveBeenCalledWith(expect.objectContaining({
            _uniqueId: pricedPrinting._uniqueId,
        }));
    });

    test('no movers is an honest empty and the headline stays', async () => {
        recentMovers.mockResolvedValue([]);
        renderAt('/binder/stats?b=system:trade');

        expect(await screen.findByText(/None of these Printings gained or lost enough to rank/)).toBeInTheDocument();
        expect(screen.getByTestId('collection-stats-headline')).toBeInTheDocument();
    });

    test('a movers error offers Retry and keeps the headline', async () => {
        recentMovers.mockRejectedValue(new Error('offline'));
        renderAt('/binder/stats?b=system:trade');

        expect(await screen.findByText('Retry')).toBeInTheDocument();
        expect(screen.getByTestId('collection-stats-headline')).toBeInTheDocument();
    });

    test('an empty Binder sends the player back to /binder', async () => {
        renderAt('/binder/stats?b=system:collection');
        expect(await screen.findByTestId('binder-page')).toBeInTheDocument();
    });

    test('Back returns to the same Binder', async () => {
        renderAt('/binder/stats?b=system:trade');
        await screen.findByTestId('collection-stats-headline');
        fireEvent.click(screen.getByRole('button', { name: /Back/i }));
        await waitFor(() => expect(screen.getByTestId('binder-page')).toBeInTheDocument());
    });
});
