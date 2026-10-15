import { useEffect } from 'react';
import Header from '../components/elements/Header.jsx';
import { Page, PageHeader } from '../components/layout/Page.jsx';
import RecentMoversSection from '../components/movers/RecentMoversSection.jsx';
import { useCardData } from '../hooks/useCardData.jsx';

const Trends = () => {
    const { metadata } = useCardData();

    useEffect(() => {
        document.title = 'Recent movers | RiftTrades';
        return () => {
            document.title = 'RiftTrades';
        };
    }, []);

    return (
        <>
            <Header lastUpdatedTimestamp={metadata?.lastUpdated || metadata?.updatedAt || null} />
            <Page>
                <PageHeader
                    title="Trends"
                    subtitle="Recent movers across the catalog, from observed Lows."
                />
                <RecentMoversSection />
            </Page>
        </>
    );
};

export default Trends;
