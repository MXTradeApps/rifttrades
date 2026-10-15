// Design tokens for the web app. Brand hues are RiftTrades' own deep teal and
// gold (the same values the previous ThemeContext palette used); the neutrals
// here are web-only and carry a slight cool bias toward the brand navy instead
// of a flat grey.
//
// Layout concept: a quiet trading desk. Neutral surfaces, one teal accent,
// numbers set in tabular figures so prices line up down every list.
export const brand = {
    teal: '#1A5A7A',
    tealBright: '#2A7A9A',
    tealDeep: '#0D4560',
    tealLight: '#3A9ABA',
    tealGlow: '#5ABADA',
    gold: '#D4A853',
    goldBright: '#E5C078',
    goldDeep: '#B8892E',
    navy: '#0A2540',
    navyDeep: '#061A2E',
};

export const fonts = {
    display: '"Archivo", "Onest", system-ui, -apple-system, "Segoe UI", sans-serif',
    body: '"Onest", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};

export const tokens = {
    light: {
        bg: '#F2F5F7',
        surface: '#FFFFFF',
        sunken: '#E9EEF2',
        hover: 'rgba(10, 37, 64, 0.05)',
        selected: 'rgba(26, 90, 122, 0.09)',
        border: 'rgba(10, 37, 64, 0.10)',
        borderStrong: 'rgba(10, 37, 64, 0.18)',
        text: '#0E1B26',
        textMuted: '#4E6272',
        textFaint: '#8A9AA7',
        accent: brand.teal,
        accentHover: brand.tealDeep,
        accentSoft: 'rgba(26, 90, 122, 0.10)',
        accentText: brand.teal,
        onAccent: '#FFFFFF',
        tan: brand.goldDeep,
        gain: '#1D8A55',
        loss: '#C9372C',
        warn: '#B86E00',
        info: '#1F6FB2',
        overlay: 'rgba(8, 20, 32, 0.45)',
        shadowSm: '0 1px 2px rgba(8, 20, 32, 0.06), 0 1px 1px rgba(8, 20, 32, 0.03)',
        shadowMd: '0 4px 16px -4px rgba(8, 20, 32, 0.12), 0 2px 4px rgba(8, 20, 32, 0.04)',
        shadowLg: '0 24px 48px -12px rgba(8, 20, 32, 0.25), 0 4px 12px rgba(8, 20, 32, 0.06)',
    },
    dark: {
        bg: '#08131E',
        surface: '#0E1C29',
        sunken: '#142636',
        hover: 'rgba(232, 244, 248, 0.06)',
        selected: 'rgba(58, 154, 186, 0.15)',
        border: 'rgba(232, 244, 248, 0.09)',
        borderStrong: 'rgba(232, 244, 248, 0.17)',
        text: '#E8F1F5',
        textMuted: '#A0B6C3',
        textFaint: '#6C8290',
        accent: brand.tealLight,
        accentHover: brand.tealGlow,
        accentSoft: 'rgba(58, 154, 186, 0.16)',
        accentText: brand.tealGlow,
        onAccent: brand.navyDeep,
        tan: brand.goldBright,
        gain: '#46C285',
        loss: '#F06A62',
        warn: '#E8A23B',
        info: '#62AEEA',
        overlay: 'rgba(0, 0, 0, 0.6)',
        shadowSm: '0 1px 2px rgba(0, 0, 0, 0.35)',
        shadowMd: '0 8px 24px -8px rgba(0, 0, 0, 0.55), 0 2px 4px rgba(0, 0, 0, 0.3)',
        shadowLg: '0 28px 56px -12px rgba(0, 0, 0, 0.7), 0 4px 12px rgba(0, 0, 0, 0.35)',
    },
};

// Shell dimensions shared by the app chrome and full-height pages.
export const shell = {
    sidebarWidth: 248,
    topBarHeight: 56,
    bottomNavHeight: 64,
};

// Tokens for whichever theme is active. Falls back by palette mode so
// components still render under a bare MUI theme (tests use createTheme()).
export const tk = (theme) => theme?.tokens ?? tokens[theme?.palette?.mode] ?? tokens.light;
