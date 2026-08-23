import { createTheme } from '@mui/material/styles';

// Riftbound theme - cosmic purple/pink gradient theme
const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#6366f1', // Indigo - represents the cosmic rift
            light: '#818cf8',
            dark: '#4f46e5',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#a855f7', // Purple - magical energy
            light: '#c084fc',
            dark: '#9333ea',
            contrastText: '#ffffff',
        },
        success: {
            main: '#10b981', // Emerald green
            light: '#34d399',
            dark: '#059669',
        },
        error: {
            main: '#ef4444',
            light: '#f87171',
            dark: '#dc2626',
        },
        warning: {
            main: '#f59e0b',
            light: '#fbbf24',
            dark: '#d97706',
        },
        info: {
            main: '#3b82f6',
            light: '#60a5fa',
            dark: '#2563eb',
        },
        background: {
            default: '#f5f3ff', // Very light purple/lavender
            paper: '#ffffff',
        },
        text: {
            primary: '#1a1625', // Dark purple-gray
            secondary: '#4c4359',
        },
    },
    typography: {
        fontFamily: '"Outfit", "Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontWeight: 700,
            letterSpacing: '-0.02em',
        },
        h2: {
            fontWeight: 700,
            letterSpacing: '-0.01em',
        },
        h3: {
            fontWeight: 700,
            letterSpacing: '-0.01em',
        },
        h4: {
            fontWeight: 700,
            letterSpacing: '-0.005em',
        },
        h5: {
            fontWeight: 600,
        },
        h6: {
            fontWeight: 600,
        },
        button: {
            textTransform: 'none',
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 12,
    },
    shadows: [
        'none',
        '0px 2px 4px rgba(99, 102, 241, 0.05)',
        '0px 4px 8px rgba(99, 102, 241, 0.08)',
        '0px 8px 16px rgba(99, 102, 241, 0.1)',
        '0px 12px 24px rgba(99, 102, 241, 0.12)',
        '0px 16px 32px rgba(99, 102, 241, 0.14)',
        '0px 20px 40px rgba(99, 102, 241, 0.16)',
        '0px 24px 48px rgba(99, 102, 241, 0.18)',
        '0px 28px 56px rgba(99, 102, 241, 0.2)',
        '0px 32px 64px rgba(99, 102, 241, 0.22)',
        '0px 36px 72px rgba(99, 102, 241, 0.24)',
        '0px 40px 80px rgba(99, 102, 241, 0.26)',
        '0px 44px 88px rgba(99, 102, 241, 0.28)',
        '0px 48px 96px rgba(99, 102, 241, 0.3)',
        '0px 52px 104px rgba(99, 102, 241, 0.32)',
        '0px 56px 112px rgba(99, 102, 241, 0.34)',
        '0px 60px 120px rgba(99, 102, 241, 0.36)',
        '0px 64px 128px rgba(99, 102, 241, 0.38)',
        '0px 68px 136px rgba(99, 102, 241, 0.4)',
        '0px 72px 144px rgba(99, 102, 241, 0.42)',
        '0px 76px 152px rgba(99, 102, 241, 0.44)',
        '0px 80px 160px rgba(99, 102, 241, 0.46)',
        '0px 84px 168px rgba(99, 102, 241, 0.48)',
        '0px 88px 176px rgba(99, 102, 241, 0.5)',
        '0px 92px 184px rgba(99, 102, 241, 0.52)',
    ],
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '10px 24px',
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0px 4px 12px rgba(99, 102, 241, 0.15)',
                    },
                },
                contained: {
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)',
                        boxShadow: '0px 6px 16px rgba(99, 102, 241, 0.2)',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
                elevation1: {
                    boxShadow: '0px 2px 8px rgba(99, 102, 241, 0.06)',
                },
                elevation2: {
                    boxShadow: '0px 4px 12px rgba(99, 102, 241, 0.08)',
                },
                elevation3: {
                    boxShadow: '0px 8px 20px rgba(99, 102, 241, 0.1)',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    boxShadow: '0px 4px 12px rgba(99, 102, 241, 0.08)',
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 600,
                    borderRadius: 8,
                },
                colorPrimary: {
                    background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                },
                colorSecondary: {
                    background: 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)',
                },
                colorSuccess: {
                    background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    boxShadow: '0px 2px 12px rgba(99, 102, 241, 0.12)',
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 8,
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#818cf8',
                        },
                    },
                },
            },
        },
        MuiListItem: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
            },
        },
    },
});

export default theme;








