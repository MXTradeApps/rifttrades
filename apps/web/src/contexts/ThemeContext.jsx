import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme } from '@mui/material/styles';

const ThemeContext = createContext();

export const useThemeMode = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeMode must be used within a ThemeModeProvider');
    }
    return context;
};

// Riftbound color palette
// Primary: Deep teal/navy blue
// Accent: Gold/Orange
// Secondary: Lighter teal/cyan

// Light theme
const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#1a5a7a',      // Deep teal
            light: '#2a7a9a',
            dark: '#0d4560',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#d4a853',      // Gold
            light: '#e5c078',
            dark: '#b8892e',
            contrastText: '#0a2540',
        },
        success: {
            main: '#10b981',
            light: '#34d399',
            dark: '#059669',
        },
        error: {
            main: '#ef4444',
            light: '#f87171',
            dark: '#dc2626',
        },
        warning: {
            main: '#d4a853',      // Gold for warning too
            light: '#e5c078',
            dark: '#b8892e',
        },
        info: {
            main: '#2a7a9a',
            light: '#4a9aba',
            dark: '#1a5a7a',
        },
        background: {
            default: '#e8f4f8',   // Light teal tint
            paper: '#ffffff',
        },
        text: {
            primary: '#0a2540',
            secondary: '#1a4a6e',
        },
    },
    typography: {
        fontFamily: '"Outfit", "Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
        button: {
            textTransform: 'none',
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '10px 24px',
                    boxShadow: 'none',
                },
                contained: {
                    background: 'linear-gradient(135deg, #1a5a7a 0%, #2a7a9a 100%)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #0d4560 0%, #1a5a7a 100%)',
                    },
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
                    background: 'linear-gradient(135deg, #1a5a7a 0%, #2a7a9a 100%)',
                },
                colorSuccess: {
                    background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                },
            },
        },
    },
});

// Dark theme - matches Riftbound's deep teal/navy aesthetic
const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#3a9aba',      // Lighter teal for visibility
            light: '#5abada',
            dark: '#2a7a9a',
            contrastText: '#0a2540',
        },
        secondary: {
            main: '#e5c078',      // Gold
            light: '#f0d498',
            dark: '#d4a853',
            contrastText: '#0a2540',
        },
        success: {
            main: '#34d399',
            light: '#6ee7b7',
            dark: '#10b981',
        },
        error: {
            main: '#f87171',
            light: '#fca5a5',
            dark: '#ef4444',
        },
        warning: {
            main: '#e5c078',
            light: '#f0d498',
            dark: '#d4a853',
        },
        info: {
            main: '#5abada',
            light: '#7acafa',
            dark: '#3a9aba',
        },
        background: {
            default: '#0a2540',   // Deep navy/teal from Riftbound
            paper: '#0d3050',
        },
        text: {
            primary: '#e8f4f8',
            secondary: '#a0c4d4',
        },
    },
    typography: {
        fontFamily: '"Outfit", "Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
        button: {
            textTransform: 'none',
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '10px 24px',
                    boxShadow: 'none',
                },
                contained: {
                    background: 'linear-gradient(135deg, #1a5a7a 0%, #3a9aba 100%)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #2a7a9a 0%, #5abada 100%)',
                    },
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
                    background: 'linear-gradient(135deg, #1a5a7a 0%, #3a9aba 100%)',
                },
                colorSuccess: {
                    background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
            },
        },
    },
});

export const ThemeModeProvider = ({ children }) => {
    // Check for saved preference or system preference
    const getInitialMode = () => {
        const saved = localStorage.getItem('riftrades-theme-mode');
        if (saved) {
            return saved;
        }
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    };

    const [mode, setMode] = useState(getInitialMode);

    // Save preference to localStorage
    useEffect(() => {
        localStorage.setItem('riftrades-theme-mode', mode);
    }, [mode]);

    const toggleMode = () => {
        setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
    };

    const theme = useMemo(() => {
        return mode === 'dark' ? darkTheme : lightTheme;
    }, [mode]);

    const value = {
        mode,
        setMode,
        toggleMode,
        theme,
        isDark: mode === 'dark'
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export default ThemeContext;
