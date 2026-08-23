import { createClient } from '@supabase/supabase-js';

// Production project: fabloodle. Web and mobile must share this project so a
// signed-in binder matches across clients. Override via Vite env for local
// experiments; Netlify should point at fabloodle or leave these unset.
const SUPABASE_URL =
    import.meta.env?.VITE_SUPABASE_URL || 'https://cnmxaccamqshgvesieez.supabase.co';

const SUPABASE_ANON_KEY =
    import.meta.env?.VITE_SUPABASE_ANON_KEY ||
    'sb_publishable_4hW7qDSTmCljfKl-dB43kQ_xSk0JFom';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
});
