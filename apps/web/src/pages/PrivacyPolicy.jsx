import { Box, Typography, Divider } from '@mui/material';
import Header from '../components/elements/Header.jsx';
import { Page, PageHeader, Panel } from '../components/layout/Page.jsx';
import { useCardData } from '../hooks/useCardData.jsx';

const LAST_UPDATED = 'July 9, 2026';

const Section = ({ title, children }) => (
    <Box component="section" sx={{ mb: 4, '&:last-of-type': { mb: 0 } }}>
        <Typography
            variant="h4"
            component="h2"
            sx={{ color: 'text.primary', mb: 1.25 }}
        >
            {title}
        </Typography>
        <Box sx={{
            fontSize: '0.84375rem',
            lineHeight: 1.75,
            color: 'text.primary',
            maxWidth: '68ch',
            '& p': { mt: 0, mb: 1.5 },
            '& ul': { pl: 3, my: 1 },
            '& li': { mb: 1 },
        }}>
            {children}
        </Box>
    </Box>
);

const PrivacyPolicy = () => {
    const { pricesUpdatedAt: lastUpdatedTimestamp } = useCardData();

    return (
        <>
            <Header lastUpdatedTimestamp={lastUpdatedTimestamp} />

            <Page maxWidth={820}>
                <PageHeader title="Privacy Policy" subtitle={`Last updated: ${LAST_UPDATED}`} />

                <Panel
                    component="article"
                    sx={{
                        p: { xs: 2.5, md: 5 },
                        '& a': { color: 'primary.main' },
                    }}
                >
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
                        See also our <a href="/terms">Terms of Use</a>.
                    </Section>

                    <Divider sx={{ my: 3 }} />

                    <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', fontStyle: 'italic' }}>
                        Riftrades is a fan-made project and is not affiliated with Riot Games.
                        Riftbound and all related names are trademarks of their respective owners.
                    </Typography>
                </Panel>
            </Page>
        </>
    );
};

export default PrivacyPolicy;
