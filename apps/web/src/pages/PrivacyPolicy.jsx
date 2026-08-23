import {
    Box,
    Paper,
    Typography,
    IconButton,
    Tooltip,
    Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useThemeMode } from "../contexts/ThemeContext.jsx";

const LAST_UPDATED = 'July 9, 2026';

const PrivacyPolicy = () => {
    const { isDark } = useThemeMode();
    const navigate = useNavigate();

    const accent = isDark ? '#d4a853' : '#1a5a7a';
    const subtle = isDark ? 'rgba(160, 196, 212, 0.8)' : 'rgba(26, 74, 110, 0.8)';
    const bodyColor = isDark ? '#e8f4f8' : '#0a2540';

    const bgGradient = isDark
        ? 'linear-gradient(135deg, #061825 0%, #0a2540 50%, #0d3050 100%)'
        : 'linear-gradient(135deg, #e8f4f8 0%, #d0e8f0 50%, #c0dce8 100%)';

    const Section = ({ title, children }) => (
        <Box sx={{ mb: 3 }}>
            <Typography
                variant="h6"
                sx={{
                    fontSize: { xs: '1.05rem', sm: '1.2rem' },
                    fontWeight: 700,
                    color: accent,
                    mb: 1
                }}
            >
                {title}
            </Typography>
            <Box sx={{
                fontSize: { xs: '0.9rem', sm: '0.95rem' },
                lineHeight: 1.7,
                color: bodyColor
            }}>
                {children}
            </Box>
        </Box>
    );

    return (
        <Box sx={{
            flexGrow: 1,
            width: '100%',
            background: bgGradient,
            overflow: 'auto',
            p: { xs: 1.5, sm: 2, md: 3 }
        }}>
            <Box sx={{ maxWidth: 800, mx: 'auto' }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2, sm: 3, md: 4 },
                        borderRadius: 3,
                        border: `2px solid ${isDark ? 'rgba(58, 154, 186, 0.2)' : 'rgba(26, 90, 122, 0.15)'}`,
                        borderTop: `4px solid ${accent}`,
                        background: isDark
                            ? 'linear-gradient(180deg, #0d3050 0%, #0a2540 100%)'
                            : 'linear-gradient(180deg, #ffffff 0%, #f0f8fa 100%)',
                        boxShadow: '0 8px 24px rgba(10, 37, 64, 0.15)'
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Tooltip title="Back to trade calculator">
                            <IconButton
                                onClick={() => navigate('/')}
                                size="small"
                                sx={{
                                    color: accent,
                                    '&:hover': {
                                        backgroundColor: isDark ? 'rgba(212, 168, 83, 0.15)' : 'rgba(26, 90, 122, 0.1)'
                                    }
                                }}
                            >
                                <ArrowBackIcon />
                            </IconButton>
                        </Tooltip>
                        <Typography sx={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: subtle
                        }}>
                            Legal
                        </Typography>
                    </Box>

                    <Typography
                        variant="h4"
                        sx={{
                            fontSize: { xs: '1.6rem', sm: '2rem', md: '2.2rem' },
                            fontWeight: 800,
                            letterSpacing: '-0.01em',
                            background: isDark
                                ? 'linear-gradient(135deg, #e5c078 0%, #d4a853 50%, #b8892e 100%)'
                                : 'linear-gradient(135deg, #0d4560 0%, #1a5a7a 50%, #2a7a9a 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            mb: 0.5
                        }}
                    >
                        Privacy Policy
                    </Typography>

                    <Typography sx={{
                        fontSize: '0.85rem',
                        color: subtle,
                        mb: 3
                    }}>
                        Last updated: {LAST_UPDATED}
                    </Typography>

                    <Divider sx={{
                        mb: 3,
                        borderColor: isDark ? 'rgba(212, 168, 83, 0.2)' : 'rgba(26, 90, 122, 0.15)'
                    }} />

                    <Section title="Overview">
                        Riftrades ("we", "us", or "the site") is a free tool for comparing the
                        value of Riftbound trading cards. This Privacy Policy explains what
                        information we collect, how we use it, and the choices you have. By using
                        Riftrades, you agree to the practices described here.
                    </Section>

                    <Section title="Information We Collect">
                        We built Riftrades to work without accounts or logins, so we do not ask
                        for your name, email address, or other personal identifiers. The trade
                        data you enter (the cards you have and want) stays in your browser and is
                        only shared when you choose to generate a shareable link. We may collect
                        limited, non-identifying technical information automatically, such as
                        browser type, device type, and general usage patterns, to keep the site
                        running and improve it.
                    </Section>

                    <Section title="Local Storage">
                        Riftrades uses your browser's local storage to remember preferences such
                        as your theme (light or dark mode) and card display filters. This data
                        never leaves your device and can be cleared at any time through your
                        browser settings.
                    </Section>

                    <Section title="Shareable Links">
                        When you create a shareable trade link, the cards and quantities in your
                        trade are encoded directly into the URL. Anyone with that link can view
                        the trade it describes. We do not store these trades on a server; the
                        information lives entirely within the link you share.
                    </Section>

                    <Section title="Third-Party Data & Services">
                        Card pricing information displayed on Riftrades is sourced from
                        third-party providers such as TCGplayer and Cardmarket. Prices are
                        provided for informational purposes only and may not reflect current
                        market values. We are not affiliated with, endorsed by, or sponsored by
                        Riot Games, TCGplayer, or Cardmarket. If the site is hosted on a
                        third-party platform, that provider may collect standard server logs in
                        accordance with its own privacy policy.
                    </Section>

                    <Section title="Cookies & Analytics">
                        Riftrades does not use tracking cookies for advertising. We use PostHog,
                        a first-party product analytics service, to understand how the site is
                        used — for example pages viewed, sign-in, trade calculator actions,
                        binder/want-list changes, and trade history. We do not use this data for
                        advertising or to track you across other companies&apos; apps or websites.
                        See{' '}
                        <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer">
                            PostHog&apos;s privacy policy
                        </a>.
                    </Section>

                    <Section title="Children's Privacy">
                        Riftrades is not directed at children under the age of 13, and we do not
                        knowingly collect personal information from children. If you believe a
                        child has provided us with personal information, please contact us so we
                        can remove it.
                    </Section>

                    <Section title="Changes to This Policy">
                        We may update this Privacy Policy from time to time. When we do, we will
                        revise the "Last updated" date at the top of this page. Continued use of
                        Riftrades after any change indicates your acceptance of the updated
                        policy.
                    </Section>

                    <Section title="Contact">
                        If you have questions about this Privacy Policy or how your information is
                        handled, please reach out via our{' '}
                        <a href="/support">Support</a> page or email{' '}
                        <a href="mailto:mxbloombusiness@gmail.com">mxbloombusiness@gmail.com</a>.
                    </Section>

                    <Divider sx={{
                        my: 3,
                        borderColor: isDark ? 'rgba(212, 168, 83, 0.2)' : 'rgba(26, 90, 122, 0.15)'
                    }} />

                    <Typography sx={{
                        fontSize: '0.8rem',
                        color: subtle,
                        fontStyle: 'italic'
                    }}>
                        Riftrades is a fan-made project and is not affiliated with Riot Games.
                        Riftbound and all related names are trademarks of their respective owners.
                    </Typography>
                </Paper>
            </Box>
        </Box>
    );
};

export default PrivacyPolicy;
