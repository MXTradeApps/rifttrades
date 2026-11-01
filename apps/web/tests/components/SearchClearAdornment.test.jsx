import { render, screen, fireEvent } from '@testing-library/react';
import SearchClearAdornment from '../../src/components/search/SearchClearAdornment.jsx';

describe('SearchClearAdornment', () => {
    test('is hidden when the field is empty', () => {
        const { container } = render(
            <SearchClearAdornment value="" onClear={() => {}} />
        );

        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument();
    });

    test('clears the value when the x is pressed', () => {
        const onClear = jest.fn();
        render(<SearchClearAdornment value="alpha" onClear={onClear} />);

        fireEvent.click(screen.getByRole('button', { name: /clear search/i }));

        expect(onClear).toHaveBeenCalledTimes(1);
    });
});
