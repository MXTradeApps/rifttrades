import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SetList from '../../src/pages/SetList.jsx';
import { ThemeModeProvider } from '../../src/contexts/ThemeContext.jsx';

jest.mock('../../src/components/elements/Header.jsx', () => ({
    __esModule: true,
    default: () => <div>Header</div>,
}));

jest.mock('../../src/hooks/useSets.js', () => ({
    useSets: () => ({
        sets: [
            { slug: 'origins', name: 'Origins', cardCount: 10, topMarketPrice: 12 },
            { slug: 'spiritforged', name: 'Spiritforged', cardCount: 8, topMarketPrice: 9 },
        ],
        loading: false,
        error: null,
    }),
}));

jest.mock('../../src/hooks/useCardData.jsx', () => ({
    useCardData: () => ({ metadata: {} }),
}));

function renderPage() {
    return render(
        <MemoryRouter>
            <ThemeModeProvider>
                <SetList />
            </ThemeModeProvider>
        </MemoryRouter>
    );
}

describe('SetList search clear', () => {
    test('clears the field and restores every set', () => {
        renderPage();

        fireEvent.change(screen.getByRole('textbox', { name: 'Search sets' }), {
            target: { value: 'Spirit' },
        });

        expect(screen.getByText('Spiritforged')).toBeInTheDocument();
        expect(screen.queryByText('Origins')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /clear search/i }));

        expect(screen.getByRole('textbox', { name: 'Search sets' })).toHaveValue('');
        expect(screen.getByText('Origins')).toBeInTheDocument();
        expect(screen.getByText('Spiritforged')).toBeInTheDocument();
    });
});
