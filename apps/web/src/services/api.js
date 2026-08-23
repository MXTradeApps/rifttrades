import { fetchLastUpdatedFromSupabase } from './supabaseCardData.js';

export async function fetchLastUpdatedTimestamp() {
    // Primary source: most recent price update in the RiftTrades Supabase DB.
    try {
        const supabaseTimestamp = await fetchLastUpdatedFromSupabase();
        if (supabaseTimestamp) {
            return supabaseTimestamp;
        }
    } catch (error) {
        console.error('Error fetching last updated timestamp from Supabase:', error);
    }

    // Fallback: local manifest written when CSVs were last pulled.
    try {
        const base = import.meta.env?.BASE_URL ?? '/';
        const response = await fetch(`${base}price-guide/manifest.json`, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const manifest = await response.json();
        return manifest?.lastUpdated ?? null;
    } catch (error) {
        console.error('Error fetching last updated timestamp:', error);
        return null;
    }
}








