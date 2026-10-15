import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PriceProvider } from '../../src/contexts/PriceContext.jsx';
import { ThemeModeProvider } from '../../src/contexts/ThemeContext.jsx';
import RecentMoversSection from '../../src/components/movers/RecentMoversSection.jsx';
import { recentMovers } from '../../src/services/recentMovers.js';
import { pricedPrinting } from '../fixtures/printings.js';

const mockOpenDetail = jest.fn();
const mockLookup = { [pricedPrinting._uniqueId]: pricedPrinting };

jest.mock('../../src/contexts/CardDetailContext.jsx', () => ({
    useCardDetail: () => ({ openDetail: mockOpenDetail }),
}));

jest.mock('../../src/hooks/useCardData.jsx', () => ({
    useCardData: () => ({
        cardIdLookup: mockLookup,
    }),
}));

jest.mock('../../src/lib/supabase.js', () => ({ supabase: { rpc: jest.fn() } }));

jest.mock('../../src/services/recentMovers.js', () => {
    const actual = jest.requireActual('../../src/services/recentMovers.js');
    return { ...actual, recentMovers: jest.fn() };
});

const gainer = {
    direction: 'gainer',
    rank: 1,
    card_id: pricedPrinting._uniqueId,
    name: 'Void Seeker',
    set_name: 'Origins',
    finish: 'Normal',
    image_url: null,
    start_low: 4,
    start_on: '2026-10-11',
    latest_low: 6,
    percent_change: 0.5,
    amount_change: 2,
};

const renderSection = () => render(
    <ThemeModeProvider>
        <PriceProvider>
            <RecentMoversSection />
        </PriceProvider>
    </ThemeModeProvider>,
);

describe('RecentMoversSection', () => {
    beforeEach(() => {
        recentMovers.mockReset();
        mockOpenDetail.mockReset();
    });

    test('lists gainers and says when there are no losers', async () => {
        recentMovers.mockResolvedValue([gainer]);
        renderSection();

        expect(await screen.findByText('Void Seeker')).toBeInTheDocument();
        expect(recentMovers).toHaveBeenCalledWith('tcgplayer');
        expect(screen.getByText('+50% · +$2')).toBeInTheDocument();
        expect(screen.getByText('No recent losers on TCGplayer.')).toBeInTheDocument();
        expect(screen.queryByText(/\$0\.00/)).not.toBeInTheDocument();
    });

    test('a mover opens that printing', async () => {
        recentMovers.mockResolvedValue([gainer]);
        renderSection();

        fireEvent.click(await screen.findByText('Void Seeker'));
        expect(mockOpenDetail).toHaveBeenCalledWith(pricedPrinting);
    });

    test('an error offers Retry, which reloads', async () => {
        recentMovers.mockRejectedValueOnce(new Error('offline'));
        recentMovers.mockResolvedValueOnce([gainer]);
        renderSection();

        fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
        await waitFor(() => expect(screen.getByText('Void Seeker')).toBeInTheDocument());
        expect(recentMovers).toHaveBeenCalledTimes(2);
    });
});
