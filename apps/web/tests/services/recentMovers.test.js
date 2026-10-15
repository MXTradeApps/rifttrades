jest.mock('../../src/lib/supabase.js', () => ({
    supabase: { rpc: jest.fn() },
}));

import { supabase } from '../../src/lib/supabase.js';
import { recentMovers, splitMoversByDirection } from '../../src/services/recentMovers.js';

describe('recentMovers', () => {
    beforeEach(() => supabase.rpc.mockReset());

    test('asks for catalog-wide movers without card ids', async () => {
        supabase.rpc.mockResolvedValue({ data: [{ card_id: 'a' }], error: null });
        await expect(recentMovers('tcgplayer')).resolves.toEqual([{ card_id: 'a' }]);
        expect(supabase.rpc).toHaveBeenCalledWith('rift_recent_movers', { p_source: 'tcgplayer' });
    });

    test('passes card ids when given', async () => {
        supabase.rpc.mockResolvedValue({ data: [], error: null });
        await recentMovers('cardmarket', ['a', 'b']);
        expect(supabase.rpc).toHaveBeenCalledWith('rift_recent_movers', {
            p_source: 'cardmarket',
            p_card_ids: ['a', 'b'],
        });
    });

    test('throws on an RPC error', async () => {
        supabase.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
        await expect(recentMovers('tcgplayer')).rejects.toThrow(/boom/);
    });

    test('splits rows by direction in order', () => {
        const rows = [
            { direction: 'gainer', card_id: 'a' },
            { direction: 'loser', card_id: 'b' },
            { direction: 'gainer', card_id: 'c' },
            { direction: 'other', card_id: 'd' },
        ];
        const { gainers, losers } = splitMoversByDirection(rows);
        expect(gainers.map((r) => r.card_id)).toEqual(['a', 'c']);
        expect(losers.map((r) => r.card_id)).toEqual(['b']);
    });
});
