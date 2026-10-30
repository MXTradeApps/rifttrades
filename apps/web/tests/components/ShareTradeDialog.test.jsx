import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ShareTradeDialog from '../../src/components/elements/ShareTradeDialog.jsx';

const items = [{ name: 'Blade Dancer', finish: 'Normal', quantity: 1, price: 4.5 }];
const wants = [{ name: 'Long Sword', finish: 'Foil', quantity: 1, price: 3 }];
const getLink = (mode) => `https://riftrades.com/?trade=${mode}`;
// Shortening fails by default, as it does off Netlify: the long link is used.
const noShorten = async (url) => url;

describe('ShareTradeDialog', () => {
    it('writes a WTT post without the trade link', () => {
        render(<ShareTradeDialog open onClose={jest.fn()} items={items} wants={wants} getLink={getLink} shorten={noShorten} />);
        const preview = screen.getByTestId('share-trade-preview-0').textContent;
        expect(preview).toMatch(/^WTT - /);
        expect(preview).toContain('Looking for:\nFoil Long Sword');
        expect(preview).not.toContain('$');
        expect(preview).not.toContain('https://');
        expect(preview.endsWith('Made on riftrades.com')).toBe(true);
        expect(screen.queryByText('Asking price')).not.toBeInTheDocument();
        expect(screen.queryByText('Discord')).not.toBeInTheDocument();
    });

    it('switches to a priced WTS post', () => {
        render(<ShareTradeDialog open onClose={jest.fn()} items={items} wants={wants} getLink={getLink} shorten={noShorten} />);
        fireEvent.click(screen.getByTestId('share-trade-mode-wts'));
        const preview = screen.getByTestId('share-trade-preview-0').textContent;
        expect(preview).toMatch(/^WTS - /);
        expect(preview).toContain('Blade Dancer $4.50');
        expect(preview).not.toContain('Long Sword');
        expect(screen.getByText('Asking price')).toBeInTheDocument();
    });

    it('opens on WTS when there are only cards to sell', () => {
        render(<ShareTradeDialog open onClose={jest.fn()} items={items} wants={[]} getLink={getLink} shorten={noShorten} />);
        expect(screen.getByTestId('share-trade-preview-0').textContent).toMatch(/^WTS - /);
    });

    it('copies the link on its own, with the WTS link leaving out wants', async () => {
        const writeText = jest.fn().mockResolvedValue();
        Object.assign(navigator, { clipboard: { writeText } });
        render(<ShareTradeDialog open onClose={jest.fn()} items={items} wants={wants} getLink={getLink} shorten={noShorten} />);
        fireEvent.click(screen.getByTestId('share-trade-copy-link'));
        expect(await screen.findByText('Link copied')).toBeInTheDocument();
        expect(writeText).toHaveBeenCalledWith('https://riftrades.com/?trade=wtt');
        fireEvent.click(screen.getByTestId('share-trade-mode-wts'));
        fireEvent.click(screen.getByTestId('share-trade-copy-link'));
        await waitFor(() => expect(writeText).toHaveBeenLastCalledWith('https://riftrades.com/?trade=wts'));
    });

    it('copies the short link once it is ready', async () => {
        const writeText = jest.fn().mockResolvedValue();
        Object.assign(navigator, { clipboard: { writeText } });
        const shorten = jest.fn(async (url) => url.replace('/?trade=', '/t/short'));
        render(<ShareTradeDialog open onClose={jest.fn()} items={items} wants={wants} getLink={getLink} shorten={shorten} />);
        await screen.findByTestId('share-trade-copy-link');
        await new Promise((resolve) => setTimeout(resolve, 0));
        fireEvent.click(screen.getByTestId('share-trade-copy-link'));
        expect(writeText).toHaveBeenCalledWith('https://riftrades.com/t/shortwtt');
        expect(shorten).toHaveBeenCalledTimes(1);
    });

    it('copies the short link even when clicked before it is ready', async () => {
        const writeText = jest.fn().mockResolvedValue();
        Object.assign(navigator, { clipboard: { writeText } });
        let finish;
        const shorten = jest.fn(() => new Promise((resolve) => { finish = resolve; }));
        render(<ShareTradeDialog open onClose={jest.fn()} items={items} wants={wants} getLink={getLink} shorten={shorten} />);
        expect(screen.getByTestId('share-trade-link').textContent).toBe('Making a short link…');
        fireEvent.click(screen.getByTestId('share-trade-copy-link'));
        expect(writeText).not.toHaveBeenCalled();
        finish('https://riftrades.com/t/aB3dE5gH');
        expect(await screen.findByText('Link copied')).toBeInTheDocument();
        expect(writeText).toHaveBeenCalledWith('https://riftrades.com/t/aB3dE5gH');
        expect(shorten).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('share-trade-link').textContent).toBe('riftrades.com/t/aB3dE5gH');
    });
});
