import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useCardData } from "../hooks/useCardData.jsx";
import { useTradeState } from "../hooks/useTradeState.js";
import Header from "../components/elements/Header.jsx";
import CardPanel from "../components/ui/CardPanel.jsx";
import TradeSummary from "../components/elements/TradeSummary.jsx";
import { fetchLastUpdatedTimestamp } from "../services/api.js";
import { EmptyState } from "../components/layout/Page.jsx";
import { useCardDetail } from "../contexts/CardDetailContext.jsx";

const Home = () => {
    const [lastUpdatedTimestamp, setLastUpdatedTimestamp] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    // Side-by-side layout needs a landscape window with room for both panels
    // next to the sidebar; everything else stacks the two sides vertically.
    const isLandscape = useMediaQuery('(min-aspect-ratio: 4/3) and (min-width: 1100px)');
    const panelView = isLandscape ? 'grid' : 'list';

    const { cardGroups, cardIdLookup, cards, dataReady, error } = useCardData();
    
    // Create unique card options that include all editions
    const cardOptions = cards.map(card => ({
        label: card.displayName,
        value: card._uniqueDisplayId,
        subTypeName: card.subTypeName,
        setName: card._setName || '',
        card: card
    }));

    const tradeState = useTradeState(cardGroups, cardIdLookup);
    const { registerAddWant } = useCardDetail();
    const addWantRef = useRef(tradeState.addWantCard);
    addWantRef.current = tradeState.addWantCard;

    useEffect(() => {
        return registerAddWant((payload) => addWantRef.current(payload));
    }, [registerAddWant]);

    // Load a trade selected from /history once the catalog is ready.
    useEffect(() => {
        if (location.state?.loadTrade && tradeState.loadTradeFromHistory && dataReady) {
            tradeState.loadTradeFromHistory(location.state.loadTrade);
            navigate(location.pathname, { replace: true, state: {} });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when history navigates in
    }, [location.state?.loadTrade, dataReady]);

    // Fetch last updated timestamp
    useEffect(() => {
        const fetchTimestamp = async () => {
            const timestamp = await fetchLastUpdatedTimestamp();
            setLastUpdatedTimestamp(timestamp);
        };
        fetchTimestamp();
    }, []);

    if (error) {
        return (
            <>
                <Header lastUpdatedTimestamp={lastUpdatedTimestamp} />
                <EmptyState
                    icon={<ErrorOutlineIcon />}
                    title="Couldn’t load card prices"
                    sx={{ minHeight: 'calc(100dvh - var(--shell-top) - var(--shell-bottom))', justifyContent: 'center' }}
                >
                    {error}
                    <Box component="span" sx={{ display: 'block', mt: 1 }}>
                        Make sure you have run `npm run download-csvs` and `npm run consolidate-csvs` first.
                    </Box>
                </EmptyState>
            </>
        );
    }

    return (
        <>
            <Header lastUpdatedTimestamp={lastUpdatedTimestamp} />

            <Box
                component="main"
                sx={{
                    display: 'flex',
                    flexDirection: isLandscape ? 'row' : 'column',
                    alignItems: 'stretch',
                    width: '100%',
                    // Fill the viewport between the shell bars so each side scrolls on its own.
                    height: isLandscape ? 'calc(100dvh - var(--shell-top) - var(--shell-bottom))' : 'auto',
                    minHeight: isLandscape ? 0 : 'calc(100dvh - var(--shell-top) - var(--shell-bottom))',
                    gap: isLandscape ? 2 : 0,
                    p: isLandscape ? { xs: 1.5, md: 2.5 } : 0,
                }}
            >
                <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                    Trade Calculator
                </h1>
                <CardPanel
                    title="Cards I Have"
                    tone="have"
                    cards={tradeState.haveList}
                    cardOptions={cardOptions}
                    allCards={cards}
                    inputValue={tradeState.haveInput}
                    onInputChange={(e, v) => tradeState.setHaveInput(v || "")}
                    onAddCard={tradeState.addHaveCard}
                    onRemoveCard={tradeState.removeHaveCard}
                    onUpdateQuantity={tradeState.updateHaveCardQuantity}
                    isMobile={isMobile}
                    totalColor="primary"
                    disabled={!dataReady}
                    isLandscape={isLandscape}
                    viewMode={panelView}
                />

                {(tradeState.haveList.length >= 0 || tradeState.wantList.length >= 0) && (
                    <TradeSummary
                        haveList={tradeState.haveList}
                        wantList={tradeState.wantList}
                        haveTotal={tradeState.haveTotal}
                        wantTotal={tradeState.wantTotal}
                        diff={tradeState.diff}
                        isLandscape={isLandscape}
                        generateShareURL={tradeState.generateShareURL}
                        clearURLTradeData={tradeState.clearURLTradeData}
                        clearTrade={tradeState.clearTrade}
                        getURLSizeInfo={tradeState.getURLSizeInfo}
                        testURLRoundTrip={tradeState.testURLRoundTrip}
                        urlTradeData={tradeState.urlTradeData}
                        hasLoadedFromURL={tradeState.hasLoadedFromURL}
                        onAddHaveCard={tradeState.addHaveCard}
                        onAddWantCard={tradeState.addWantCard}
                    />
                )}

                <CardPanel
                    title="Cards I Want"
                    tone="want"
                    cards={tradeState.wantList}
                    cardOptions={cardOptions}
                    allCards={cards}
                    inputValue={tradeState.wantInput}
                    onInputChange={(e, v) => tradeState.setWantInput(v || "")}
                    onAddCard={tradeState.addWantCard}
                    onRemoveCard={tradeState.removeWantCard}
                    onUpdateQuantity={tradeState.updateWantCardQuantity}
                    isMobile={isMobile}
                    totalColor="success"
                    disabled={!dataReady}
                    isLandscape={isLandscape}
                    viewMode={panelView}
                />
            </Box>
        </>
    );
};

export default Home;
