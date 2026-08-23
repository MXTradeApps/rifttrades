import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { useCardData } from "../hooks/useCardData.jsx";
import { useTradeState } from "../hooks/useTradeState.js";
import Header from "../components/elements/Header.jsx";
import CardPanel from "../components/ui/CardPanel.jsx";
import TradeSummary from "../components/elements/TradeSummary.jsx";
import { fetchLastUpdatedTimestamp } from "../services/api.js";
import { useThemeMode } from "../contexts/ThemeContext.jsx";
import { useCardDetail } from "../contexts/CardDetailContext.jsx";

const Home = () => {
    const [lastUpdatedTimestamp, setLastUpdatedTimestamp] = useState(null);
    const { isDark } = useThemeMode();
    const location = useLocation();
    const navigate = useNavigate();

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    // Detect landscape vs portrait orientation using aspect ratio
    const isLandscape = useMediaQuery('(min-aspect-ratio: 4/3)');
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

    // Background gradients based on theme - Riftbound teal/navy
    const bgGradient = isDark 
        ? 'linear-gradient(135deg, #061825 0%, #0a2540 50%, #0d3050 100%)'
        : 'linear-gradient(135deg, #e8f4f8 0%, #d0e8f0 50%, #c0dce8 100%)';

    if (error) {
        return (
            <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                height: 'calc(100vh - 28px)', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: bgGradient
            }}>
                <Typography variant="h6" color="error" sx={{ mb: 2 }}>
                    Error loading card data
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {error}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Make sure you have run `npm run download-csvs` and `npm run consolidate-csvs` first.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: 'calc(100vh - 28px)', 
            width: '100%',
            overflow: isLandscape ? 'hidden' : 'auto',
            background: bgGradient,
            backgroundAttachment: 'fixed'
        }}>
            <Header lastUpdatedTimestamp={lastUpdatedTimestamp} />

            <Box sx={{ 
                display: 'flex', 
                flexGrow: 1, 
                flexDirection: isLandscape ? 'row' : 'column',
                width: '100%',
                minHeight: 0,
                gap: isLandscape ? 1.25 : 0,
                p: isLandscape ? 1.25 : 0
            }}>
                <CardPanel
                    title="Cards I Have"
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
        </Box>
    );
};

export default Home;
