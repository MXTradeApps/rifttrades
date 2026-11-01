import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchInput from '../../src/components/search/SearchInput.jsx';
import { ThemeModeProvider } from '../../src/contexts/ThemeContext.jsx';

jest.mock('../../src/contexts/PriceContext.jsx', () => ({
    usePriceType: () => ({ priceSource: 'tcgplayer' }),
}));

jest.mock('../../src/contexts/CardDetailContext.jsx', () => ({
    useCardDetail: () => ({ openDetail: jest.fn() }),
}));

// Options highlight the match, so a label can span several elements.
const optionText = (text) => (_content, el) =>
    el?.textContent === text && ![...el.children].some((child) => child.textContent === text);

const items = [
    { label: 'Alpha One', value: 'a1' },
    { label: 'Alpha Two', value: 'a2' },
    { label: 'Beta Three', value: 'b3' },
];

function Harness() {
    const [value, setValue] = useState('');
    return (
        <ThemeModeProvider>
            <SearchInput
                label="Search"
                items={items}
                value={value}
                onChange={(_e, next) => setValue(next || '')}
            />
        </ThemeModeProvider>
    );
}

describe('SearchInput clear', () => {
    test('hides the x when the field is empty', () => {
        render(<Harness />);

        expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument();
    });

    test('clears the field and resets the search results', () => {
        render(<Harness />);

        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Beta' } });

        expect(screen.getByRole('textbox')).toHaveValue('Beta');
        expect(screen.getByText(optionText('Beta Three'))).toBeInTheDocument();
        expect(screen.queryByText(optionText('Alpha One'))).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /clear search/i }));

        expect(screen.getByRole('textbox')).toHaveValue('');
        expect(screen.getByText(optionText('Alpha One'))).toBeInTheDocument();
        expect(screen.getByText(optionText('Alpha Two'))).toBeInTheDocument();
        expect(screen.getByText(optionText('Beta Three'))).toBeInTheDocument();
    });
});
