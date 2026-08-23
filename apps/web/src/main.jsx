import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import posthog from 'posthog-js'
import { PostHogErrorBoundary, PostHogProvider } from '@posthog/react'
import './index.css'
import App from './App.jsx'
import { CardDataProvider } from "./hooks/useCardData.jsx";
import { PriceProvider } from "./contexts/PriceContext.jsx";
import { ThemeModeProvider, useThemeMode } from "./contexts/ThemeContext.jsx";

const posthogToken = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

if (posthogToken) {
    posthog.init(posthogToken, {
        api_host: posthogHost,
        defaults: '2026-01-30',
        person_profiles: 'identified_only',
        capture_exceptions: true,
    });
}

// Wrapper component that applies the dynamic theme
const ThemedApp = () => {
    const { theme } = useThemeMode();
    
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <PriceProvider>
                <CardDataProvider>
                    <App />
                </CardDataProvider>
            </PriceProvider>
        </ThemeProvider>
    );
};

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <PostHogProvider client={posthog}>
            <PostHogErrorBoundary>
                <ThemeModeProvider>
                    <BrowserRouter>
                        <ThemedApp />
                    </BrowserRouter>
                </ThemeModeProvider>
            </PostHogErrorBoundary>
        </PostHogProvider>
    </StrictMode>,
)
