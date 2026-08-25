import {
    Box,
    Paper,
    Typography,
    IconButton,
    Tooltip,
    Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link, useNavigate } from 'react-router-dom';
import { useThemeMode } from "../contexts/ThemeContext.jsx";

const LAST_UPDATED = 'July 31, 2026';

const TermsOfUse = () => {
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
                fontSize: { xs: '0.95rem', sm: '1rem' },
                lineHeight: 1.7,
                color: bodyColor,
                '& p': { mb: 1.5 },
                '& ul': { pl: 3, mb: 1.5 },
                '& li': { mb: 0.75 },
                '& a': { color: accent, fontWeight: 600 },
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
                        Terms of Use
                    </Typography>

                    <Typography sx={{
                        fontSize: '0.85rem',
                        color: subtle,
                        mb: 3
                    }}>
                        Effective date: {LAST_UPDATED}
                    </Typography>

                    <Divider sx={{
                        mb: 3,
                        borderColor: isDark ? 'rgba(212, 168, 83, 0.2)' : 'rgba(26, 90, 122, 0.15)'
                    }} />

                    <Section title="Agreement">
                        <p>
                            These Terms of Use (&quot;Terms&quot;) govern your access to and use of the
                            riftrades.com website (the &quot;Website&quot;) and the RiftTrades mobile
                            application for Android and iOS (the &quot;App&quot;) — together, the
                            &quot;Services&quot; — operated by RiftTrades (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
                            By using the Services, you agree to these Terms. If you do not agree,
                            do not use the Services.
                        </p>
                        <p>
                            RiftTrades is a free, fan-made trade balancer and price guide for the
                            Riftbound trading card game. RiftTrades is not affiliated with, endorsed
                            by, or sponsored by Riot Games, UVS Games, or TCGplayer. Card names and
                            images are the property of their respective owners.
                        </p>
                    </Section>

                    <Section title="The Services">
                        <p>
                            The Services help you look up card prices, balance trades, manage a
                            collection and want list, and (optionally) sync that data across devices
                            when you sign in. We may change, suspend, or discontinue any part of the
                            Services at any time.
                        </p>
                        <p>
                            Price information is provided for convenience only and may be incomplete,
                            delayed, or inaccurate. You are responsible for confirming values before
                            completing any real-world trade or purchase.
                        </p>
                    </Section>

                    <Section title="Accounts">
                        <p>
                            You can use most features of the Services without an account, including
                            purchasing RiftTrades Pro on this device. Signing in is optional and
                            enables cloud sync and lets Pro follow you to other devices. You are
                            responsible for activity under your account and for keeping your sign-in
                            credentials secure. You must provide accurate information and be at least
                            13 years old (or the minimum age required in your jurisdiction).
                        </p>
                    </Section>

                    <Section title="RiftTrades Pro Subscriptions">
                        <p>
                            RiftTrades Pro is an optional auto-renewable subscription that unlocks
                            paid features in the App. Subscriptions are offered as:
                        </p>
                        <ul>
                            <li>RiftTrades Pro Monthly — one-month auto-renewable subscription.</li>
                            <li>RiftTrades Pro Yearly — one-year auto-renewable subscription.</li>
                        </ul>
                        <p>
                            Payment is charged to your Apple ID or Google Play account at confirmation
                            of purchase. The subscription automatically renews unless auto-renew is
                            turned off at least 24 hours before the end of the current period. Your
                            account will be charged for renewal within 24 hours prior to the end of
                            the current period at the then-current price. You can manage or cancel
                            your subscription in your device&apos;s account settings (App Store or Google
                            Play subscription management) after purchase.
                        </p>
                        <p>
                            Any unused portion of a free trial, if offered, is forfeited when you
                            purchase a subscription where applicable. Prices shown in the App are the
                            current offer prices for your storefront and may vary by region.
                        </p>
                    </Section>

                    <Section title="Acceptable Use">
                        <p>You agree not to:</p>
                        <ul>
                            <li>Use the Services for any unlawful purpose.</li>
                            <li>
                                Attempt to access systems or data you are not authorized to access.
                            </li>
                            <li>
                                Interfere with or disrupt the Services, including by scraping,
                                overloading, or reverse-engineering non-public parts of the App or
                                Website beyond what applicable law allows.
                            </li>
                            <li>
                                Misrepresent your identity or affiliation when using the Services.
                            </li>
                        </ul>
                    </Section>

                    <Section title="Intellectual Property">
                        <p>
                            We and our licensors own the Services&apos; software, design, and branding.
                            Riftbound card names, artwork, and related marks belong to their
                            respective owners. You may not copy, modify, or redistribute the Services
                            except as expressly allowed by these Terms or applicable law.
                        </p>
                    </Section>

                    <Section title="Disclaimer of Warranties">
                        <p>
                            THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF
                            ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF
                            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                            WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR
                            THAT PRICE DATA WILL BE ACCURATE OR COMPLETE.
                        </p>
                    </Section>

                    <Section title="Limitation of Liability">
                        <p>
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW, RIFTTRADES AND ITS OPERATORS WILL
                            NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
                            PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM
                            YOUR USE OF THE SERVICES. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO
                            THE SERVICES WILL NOT EXCEED THE AMOUNT YOU PAID US FOR RIFTTRADES PRO IN
                            THE TWELVE MONTHS BEFORE THE CLAIM, OR USD $50 IF YOU HAVE NOT PAID US.
                        </p>
                    </Section>

                    <Section title="Privacy">
                        <p>
                            Our{' '}
                            <Link to="/privacy">Privacy Policy</Link>
                            {' '}explains how we collect, use, and share information. By using the
                            Services, you also agree to that policy.
                        </p>
                    </Section>

                    <Section title="Apple-Required Terms">
                        <p>
                            If you downloaded the App from the Apple App Store, you acknowledge that
                            these Terms are between you and RiftTrades only, not Apple, and that Apple
                            is not responsible for the App or its content. Apple has no obligation to
                            provide maintenance or support for the App. To the maximum extent
                            permitted by law, Apple has no warranty obligation with respect to the
                            App. Apple is not responsible for addressing any claims by you or a third
                            party relating to the App or your possession and use of it, including
                            product liability claims, claims that the App fails to conform to legal or
                            regulatory requirements, and claims arising under consumer protection or
                            similar legislation. Apple is not responsible for the investigation,
                            defense, settlement, or discharge of any third-party claim that the App or
                            your possession and use of it infringes that third party&apos;s intellectual
                            property rights. Apple and Apple&apos;s subsidiaries are third-party
                            beneficiaries of these Terms, and upon your acceptance of these Terms,
                            Apple will have the right to enforce these Terms against you as a
                            third-party beneficiary.
                        </p>
                    </Section>

                    <Section title="Changes">
                        <p>
                            We may update these Terms from time to time. Changes will be posted on
                            this page with an updated effective date. Continued use of the Services
                            after changes take effect constitutes acceptance of the revised Terms.
                        </p>
                    </Section>

                    <Section title="Contact Us">
                        <p>
                            If you have questions about these Terms, contact us at:{' '}
                            <a href="mailto:mxbloombusiness@gmail.com">mxbloombusiness@gmail.com</a>
                            {' '}or via our <Link to="/support">Support</Link> page.
                        </p>
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

export default TermsOfUse;
