import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from '../../src/components/elements/Header.jsx';

jest.mock('../../src/contexts/ThemeContext.jsx', () => ({
    useThemeMode: () => ({
        isDark: true,
        toggleMode: jest.fn(),
    }),
}));

jest.mock('../../src/components/auth/LoginButton.jsx', () => ({
    __esModule: true,
    default: () => <button type="button">Sign in</button>,
}));

function renderHeader(initialPath = '/binder') {
    return render(
        <MemoryRouter initialEntries={[initialPath]}>
            <Header lastUpdatedTimestamp={null} />
        </MemoryRouter>
    );
}

describe('Header drawer', () => {
    test('links Browse Sets to /sets instead of embedding a sets list', () => {
        renderHeader('/binder');

        fireEvent.click(screen.getByRole('button', { name: /menu/i }));

        const browse = screen.getByRole('link', { name: /browse sets/i });
        expect(browse).toHaveAttribute('href', '/sets');
        expect(screen.queryByText('Loading sets…')).not.toBeInTheDocument();
        expect(screen.queryByText('Sets · Most Expensive')).not.toBeInTheDocument();
    });

    test('links Terms of Use to /terms', () => {
        renderHeader('/');

        fireEvent.click(screen.getByRole('button', { name: /menu/i }));

        const terms = screen.getByRole('link', { name: /terms of use/i });
        expect(terms).toHaveAttribute('href', '/terms');
    });

    test('links Support to /support', () => {
        renderHeader('/');

        fireEvent.click(screen.getByRole('button', { name: /menu/i }));

        const support = screen.getByRole('link', { name: /^support$/i });
        expect(support).toHaveAttribute('href', '/support');
    });

    test('Want List is one step to /wants and Binder dest is /binder', () => {
        renderHeader('/');

        fireEvent.click(screen.getByRole('button', { name: /menu/i }));

        expect(screen.getByRole('link', { name: /want list/i })).toHaveAttribute('href', '/wants');
        expect(screen.getAllByRole('link', { name: /my binders/i })[0]).toHaveAttribute('href', '/binder');
    });
});
