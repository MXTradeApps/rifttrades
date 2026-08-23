import React, { useState } from 'react';
import { 
    Box, 
    Typography, 
    Chip, 
    Button,
    Tooltip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    ToggleButtonGroup,
    ToggleButton,
    Snackbar,
    TextField,
    Alert,
    FormControlLabel,
    Checkbox,
} from '@mui/material';
import { 
    Warning as WarningIcon,
    Clear as ClearIcon,
    AutoFixHigh as AutoFixHighIcon,
    BookmarkAdd as BookmarkAddIcon,
    CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { formatCurrency } from "../../utils/helpers.js";
import { usePriceType } from "../../contexts/PriceContext.jsx";
import { useThemeMode } from "../../contexts/ThemeContext.jsx";
import { useAuth } from "../../contexts/AuthContext.jsx";
import FindFillerDialog from "./FindFillerDialog.jsx";
import { FILLER_BALANCE_THRESHOLD } from "../../utils/findFiller.js";
import { saveTradeToHistory } from "../../services/tradeHistory.js";
import { confirmTrade } from "../../services/confirmTrade.js";
import { FreeLimits } from "../../utils/freeLimits.js";
import { capture } from "../../lib/analytics.js";

const TradeSummary = ({ 
    haveList, 
    wantList, 
    haveTotal, 
    wantTotal, 
    diff, 
    isLandscape = false,
    clearURLTradeData,
    clearTrade,
    urlTradeData,
    hasLoadedFromURL,
    onAddHaveCard,
    onAddWantCard
}) => {
    const { priceType, setPriceType, priceSource, setPriceSource } = usePriceType();
    const { isDark } = useThemeMode();
    const { user } = useAuth();
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showFiller, setShowFiller] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [tradeName, setTradeName] = useState('');
    const [saving, setSaving] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [removeGiven, setRemoveGiven] = useState(true);
    const [addReceived, setAddReceived] = useState(true);
    const [confirming, setConfirming] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const isUnbalanced = Math.abs(diff) >= FILLER_BALANCE_THRESHOLD;
    const canActOnTrade = haveList.length > 0 || wantList.length > 0;

    // Calculate total card count including quantities
    const getTotalCardCount = (cardList) => {
        return cardList.reduce((sum, card) => sum + (card.quantity || 1), 0);
    };

    const haveCardCount = getTotalCardCount(haveList);
    const wantCardCount = getTotalCardCount(wantList);

    const handlePriceTypeChange = (event, newPriceType) => {
        if (newPriceType !== null) {
            setPriceType(newPriceType);
            capture('price_type_changed', { price_type: newPriceType, price_source: priceSource });
        }
    };

    const handlePriceSourceChange = (event, newPriceSource) => {
        if (newPriceSource !== null) {
            setPriceSource(newPriceSource);
            capture('price_source_changed', { price_source: newPriceSource, price_type: priceType });
        }
    };

    // Format currency based on price source
    const formatPrice = (amount) => {
        if (priceSource === 'cardmarket') {
            return new Intl.NumberFormat('de-DE', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }).format(amount);
        }
        return formatCurrency(amount);
    };

    const handleClearTradeData = () => {
        if (typeof clearTrade === 'function') {
            clearTrade();
        } else {
            clearURLTradeData?.();
            capture('trade_cleared', {
                have_count: haveList.length,
                want_count: wantList.length,
                source: 'url_clear',
            });
        }
        setShowClearConfirm(false);
    };

    const handleOpenSaveDialog = () => {
        const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        setTradeName(`Trade ${today}`);
        setShowSaveDialog(true);
    };

    const handleSaveTrade = async () => {
        setSaving(true);
        const { error, trimmed } = await saveTradeToHistory(tradeName, haveList, wantList, {
            haveTotal,
            wantTotal,
            diff
        });
        setSaving(false);
        if (error) {
            setSnackbar({ open: true, message: error.message || 'Failed to save trade', severity: 'error' });
            capture('trade_save_failed', { error_message: error.message || 'unknown' });
            return;
        }
        capture('trade_saved', {
            have_count: haveCardCount,
            want_count: wantCardCount,
            have_total: haveTotal,
            want_total: wantTotal,
            diff,
            rolled_off: trimmed || 0,
            signed_in: Boolean(user),
        });
        setShowSaveDialog(false);
        setSnackbar(
            trimmed > 0
                ? {
                    open: true,
                    message: `Trade saved — your ${trimmed === 1 ? 'oldest trade' : `${trimmed} oldest trades`} `
                        + `rolled off the free ${FreeLimits.savedTrades}-trade history`,
                    severity: 'info',
                }
                : { open: true, message: 'Trade saved — find it under Trade History', severity: 'success' },
        );
    };

    const handleOpenConfirmDialog = () => {
        setRemoveGiven(haveCardCount > 0);
        setAddReceived(wantCardCount > 0);
        setShowConfirmDialog(true);
    };

    const handleConfirmTrade = async () => {
        setConfirming(true);
        const { error, trimmed } = await confirmTrade({
            haveList,
            wantList,
            totals: { haveTotal, wantTotal, diff },
            removeGivenFromBinder: removeGiven && haveCardCount > 0,
            addReceivedToBinder: addReceived && wantCardCount > 0,
        });
        setConfirming(false);
        if (error) {
            setSnackbar({
                open: true,
                message: error.message || 'Failed to confirm trade',
                severity: 'error',
            });
            capture('trade_confirm_failed', { error_message: error.message || 'unknown' });
            return;
        }
        capture('trade_confirmed', {
            have_count: haveCardCount,
            want_count: wantCardCount,
            have_total: haveTotal,
            want_total: wantTotal,
            diff,
            remove_given: removeGiven && haveCardCount > 0,
            add_received: addReceived && wantCardCount > 0,
            rolled_off: trimmed || 0,
        });
        setShowConfirmDialog(false);
        if (typeof clearTrade === 'function') {
            clearTrade();
        }
        setSnackbar(
            trimmed > 0
                ? {
                    open: true,
                    message: `Trade confirmed. The free plan keeps your last ${FreeLimits.savedTrades} trades.`,
                    severity: 'info',
                }
                : { open: true, message: 'Trade confirmed', severity: 'success' },
        );
    };

    const formatAge = (ageInDays) => {
        if (ageInDays < 1) return 'less than a day';
        if (ageInDays < 7) return `${Math.round(ageInDays)} day${Math.round(ageInDays) !== 1 ? 's' : ''}`;
        if (ageInDays < 30) return `${Math.round(ageInDays / 7)} week${Math.round(ageInDays / 7) !== 1 ? 's' : ''}`;
        return `${Math.round(ageInDays / 30)} month${Math.round(ageInDays / 30) !== 1 ? 's' : ''}`;
    };

    // Common toggle button styles - Riftbound teal/gold
    const toggleButtonSx = {
        '& .MuiToggleButton-root': {
            px: { xs: 0.75, sm: 1 },
            py: { xs: 0.25, sm: 0.5 },
            fontSize: { xs: '0.65rem', sm: '0.7rem' },
            textTransform: 'none',
            border: isDark ? '1px solid rgba(58, 154, 186, 0.4)' : '1px solid rgba(26, 90, 122, 0.3)',
            color: isDark ? '#5abada' : '#1a5a7a',
            '&.Mui-selected': {
                backgroundColor: isDark ? '#3a9aba' : '#1a5a7a',
                color: isDark ? '#0a2540' : '#ffffff',
                '&:hover': {
                    backgroundColor: isDark ? '#5abada' : '#0d4560'
                }
            },
            '&:hover': {
                backgroundColor: isDark ? 'rgba(58, 154, 186, 0.15)' : 'rgba(26, 90, 122, 0.08)'
            }
        }
    };

    // Theme-aware colors - Riftbound palette
    const textColor = isDark ? '#e8f4f8' : '#0a2540';
    const bgGradient = isLandscape 
        ? (isDark ? 'linear-gradient(180deg, #0d3050 0%, #0a2540 100%)' : 'linear-gradient(180deg, #ffffff 0%, #e8f4f8 100%)')
        : (isDark ? 'linear-gradient(90deg, #0a2540 0%, #0d3050 50%, #0a2540 100%)' : 'linear-gradient(90deg, #e8f4f8 0%, #ffffff 50%, #e8f4f8 100%)');

    return (
        <>
        <Box sx={{
            display: 'flex',
            flexDirection: isLandscape ? 'column' : 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 0,
            p: isLandscape ? 2.5 : 0,
            background: bgGradient,
            borderTop: isLandscape ? 'none' : `3px solid #d4a853`,
            borderBottom: isLandscape ? 'none' : `3px solid #d4a853`,
            borderRadius: isLandscape ? 3 : 0,
            border: isLandscape ? `2px solid ${isDark ? 'rgba(212, 168, 83, 0.3)' : 'rgba(26, 90, 122, 0.15)'}` : 'none',
            width: isLandscape ? '280px' : '100%',
            minWidth: isLandscape ? '280px' : 'auto',
            maxWidth: isLandscape ? '320px' : '100%',
            boxSizing: 'border-box',
            boxShadow: isLandscape ? '0 8px 24px rgba(10, 37, 64, 0.2)' : '0 4px 12px rgba(10, 37, 64, 0.1)'
        }}>
            {/* Price Source & Type Selectors - Landscape mode (stacked) */}
            {isLandscape && (
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 1,
                    px: 1,
                    py: 1.5,
                    borderBottom: `2px solid ${isDark ? 'rgba(212, 168, 83, 0.2)' : 'rgba(26, 90, 122, 0.1)'}`,
                    width: '100%'
                }}>
                    {/* Price Source: TCGPlayer vs CardMarket */}
                    <ToggleButtonGroup
                        value={priceSource}
                        exclusive
                        onChange={handlePriceSourceChange}
                        size="small"
                        sx={toggleButtonSx}
                    >
                        <ToggleButton value="tcgplayer" aria-label="TCGPlayer prices (USD)">
                            🇺🇸 TCGPlayer
                        </ToggleButton>
                        <ToggleButton value="cardmarket" aria-label="CardMarket prices (EUR)">
                            🇪🇺 CardMarket
                        </ToggleButton>
                    </ToggleButtonGroup>
                    
                    {/* Price Type: Market vs Low */}
                    <ToggleButtonGroup
                        value={priceType}
                        exclusive
                        onChange={handlePriceTypeChange}
                        size="small"
                        sx={toggleButtonSx}
                    >
                        <ToggleButton value="market" aria-label="market/trend price">
                            {priceSource === 'cardmarket' ? 'Trend' : 'Market'}
                        </ToggleButton>
                        <ToggleButton value="low" aria-label="low price">
                            Low
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            )}

            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: isLandscape ? 1 : 2,
                px: isLandscape ? 1 : { xs: 0.5, sm: 0.75, md: 1 },
                py: isLandscape ? 1 : { xs: 0.25, sm: 0.5, md: 0.75 },
                flexDirection: isLandscape ? 'column' : 'row'
            }}>
                <Typography variant="h6" sx={{ 
                    fontWeight: 'medium', 
                    color: textColor, 
                    fontSize: isLandscape ? '0.75rem' : { xs: '0.8rem', sm: '0.9rem' },
                    textAlign: 'center'
                }}>
                    My {haveCardCount} cards
                </Typography>
                <Chip 
                    label={formatPrice(haveTotal.toFixed(2))} 
                    color="primary" 
                    variant="filled" 
                    size={isLandscape ? 'small' : 'medium'}
                />
            </Box>

            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: isLandscape ? 1 : 1,
                px: isLandscape ? 2 : { xs: 1 },
                py: isLandscape ? 2 : { xs: 0.75 },
                background: isDark 
                    ? 'linear-gradient(135deg, #0a2540 0%, #0d3050 100%)' 
                    : 'linear-gradient(135deg, #ffffff 0%, #f0f8fa 100%)',
                borderTop: isLandscape ? 'none' : `2px solid ${isDark ? 'rgba(212, 168, 83, 0.2)' : 'rgba(26, 90, 122, 0.1)'}`,
                borderBottom: isLandscape ? 'none' : `2px solid ${isDark ? 'rgba(212, 168, 83, 0.2)' : 'rgba(26, 90, 122, 0.1)'}`,
                borderRadius: isLandscape ? 2 : 0,
                mx: isLandscape ? 0 : 0,
                my: isLandscape ? 1 : 0,
                flexDirection: isLandscape ? 'column' : 'row',
                flexWrap: 'wrap',
                boxShadow: isLandscape ? '0 2px 8px rgba(10, 37, 64, 0.1)' : 'none'
            }}>
                {/* Price Source & Type Selectors - Portrait mode */}
                {!isLandscape && (
                    <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.5,
                        mr: 1
                    }}>
                        {/* Price Source: TCGPlayer vs CardMarket */}
                        <ToggleButtonGroup
                            value={priceSource}
                            exclusive
                            onChange={handlePriceSourceChange}
                            size="small"
                            sx={toggleButtonSx}
                        >
                            <ToggleButton value="tcgplayer" aria-label="TCGPlayer prices (USD)">
                                🇺🇸 TCG
                            </ToggleButton>
                            <ToggleButton value="cardmarket" aria-label="CardMarket prices (EUR)">
                                🇪🇺 CM
                            </ToggleButton>
                        </ToggleButtonGroup>
                        
                        {/* Price Type: Market vs Low */}
                        <ToggleButtonGroup
                            value={priceType}
                            exclusive
                            onChange={handlePriceTypeChange}
                            size="small"
                            sx={toggleButtonSx}
                        >
                            <ToggleButton value="market" aria-label="market/trend price">
                                {priceSource === 'cardmarket' ? 'Trend' : 'Market'}
                            </ToggleButton>
                            <ToggleButton value="low" aria-label="low price">
                                Low
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                )}

                {/* Difference section - centered */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isLandscape ? 1 : 2,
                    flexDirection: isLandscape ? 'column' : 'row',
                    justifyContent: 'center',
                    flexGrow: !isLandscape ? 1 : 'none',
                    flexWrap: 'wrap'
                }}>
                    <Typography variant="h6" sx={{ 
                        fontWeight: 'bold', 
                        color: textColor, 
                        fontSize: isLandscape ? '0.75rem' : { xs: '0.8rem' },
                        textAlign: 'center'
                    }}>
                        Difference
                    </Typography>
                    <Chip
                        label={diff > 0 ? `+${formatPrice(diff.toFixed(2))}` : formatPrice(diff.toFixed(2))}
                        color={diff > 0 ? 'primary' : diff < 0 ? 'success' : 'default'}
                        variant="filled"
                        size={isLandscape ? 'small' : 'medium'}
                    />
                    {isUnbalanced && onAddHaveCard && onAddWantCard && (
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={<AutoFixHighIcon sx={{ fontSize: '14px !important' }} />}
                            onClick={() => {
                                capture('filler_opened', {
                                    have_count: haveCardCount,
                                    want_count: wantCardCount,
                                    diff,
                                });
                                setShowFiller(true);
                            }}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: isLandscape ? '0.7rem' : { xs: '0.7rem', sm: '0.75rem' },
                                px: 1.25,
                                py: 0.35,
                                borderRadius: 5,
                                backgroundColor: isDark ? '#3a9aba' : '#1a5a7a',
                                color: isDark ? '#0a2540' : '#ffffff',
                                boxShadow: 'none',
                                '&:hover': {
                                    backgroundColor: isDark ? '#5abada' : '#0d4560',
                                    boxShadow: 'none'
                                }
                            }}
                        >
                            Find Trade Filler
                        </Button>
                    )}
                </Box>

                {/* Clear Button - on the right side for portrait mode */}
                {!isLandscape && hasLoadedFromURL && urlTradeData && (
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        ml: 1
                    }}>
                        <Tooltip title="Clear loaded trade data from URL">
                            <IconButton
                                size="small"
                                onClick={() => setShowClearConfirm(true)}
                                sx={{ color: 'warning.main', p: 0.5 }}
                            >
                                <ClearIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}

                {/* Clear Button for landscape mode - below difference */}
                {isLandscape && hasLoadedFromURL && urlTradeData && (
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        mt: 1
                    }}>
                        <Tooltip title="Clear loaded trade data from URL">
                            <IconButton
                                size="small"
                                onClick={() => setShowClearConfirm(true)}
                                sx={{ color: 'warning.main', p: 0.5 }}
                            >
                                <ClearIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}
            </Box>

            {/* Their Cards Summary */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: isLandscape ? 1 : 2,
                px: isLandscape ? 1 : { xs: 0.5, sm: 0.75, md: 1 },
                py: isLandscape ? 1 : { xs: 0.25, sm: 0.5, md: 0.75 },
                flexDirection: isLandscape ? 'column' : 'row'
            }}>
                <Typography variant="h6" sx={{ 
                    fontWeight: 'medium', 
                    color: textColor, 
                    fontSize: isLandscape ? '0.75rem' : { xs: '0.8rem', sm: '0.9rem' },
                    textAlign: 'center'
                }}>
                    Their {wantCardCount} cards
                </Typography>
                <Chip 
                    label={formatPrice(wantTotal.toFixed(2))} 
                    color="success" 
                    variant="filled" 
                    size={isLandscape ? 'small' : 'medium'}
                />
            </Box>

            {/* URL Age Warning */}
            {urlTradeData && urlTradeData.ageInDays > 7 && (
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: isLandscape ? 1 : { xs: 0.5, sm: 0.75, md: 1 },
                    py: 0.5,
                    backgroundColor: isDark ? 'rgba(212, 168, 83, 0.2)' : '#fff3cd',
                    borderTop: `1px solid ${isDark ? 'rgba(212, 168, 83, 0.3)' : '#ffeaa7'}`,
                    borderBottom: `1px solid ${isDark ? 'rgba(212, 168, 83, 0.3)' : '#ffeaa7'}`
                }}>
                    <WarningIcon fontSize="small" sx={{ color: isDark ? '#e5c078' : '#856404' }} />
                    <Typography variant="caption" sx={{ color: isDark ? '#e5c078' : '#856404', fontSize: '0.7rem' }}>
                        Trade data is {formatAge(urlTradeData.ageInDays)} old
                    </Typography>
                </Box>
            )}

            {/* Confirm / Save (signed-in only) */}
            {user && (
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 0.75,
                    px: isLandscape ? 0.75 : { xs: 1, sm: 1.5 },
                    py: isLandscape ? 0.75 : { xs: 0.4, sm: 0.6 },
                    width: '100%',
                    boxSizing: 'border-box',
                    borderTop: `1px solid ${isDark ? 'rgba(212, 168, 83, 0.2)' : 'rgba(26, 90, 122, 0.12)'}`
                }}>
                    <Tooltip title="Record the trade and update your Binder">
                        <span>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<CheckCircleIcon />}
                                onClick={handleOpenConfirmDialog}
                                disabled={!canActOnTrade}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    px: 1.5,
                                    py: 0.25,
                                    minHeight: 28,
                                    background: 'linear-gradient(135deg, #1a5a7a 0%, #3a9aba 100%)',
                                    boxShadow: '0 1px 4px rgba(10, 37, 64, 0.25)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #0d4560 0%, #1a5a7a 100%)',
                                    },
                                }}
                            >
                                Confirm Trade
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip title="Save this trade to your history without changing your Binder">
                        <span>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<BookmarkAddIcon />}
                                onClick={handleOpenSaveDialog}
                                disabled={!canActOnTrade}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    px: 1.5,
                                    py: 0.25,
                                    minHeight: 28,
                                    color: isDark ? '#e5c078' : '#1a5a7a',
                                    borderColor: isDark ? 'rgba(212, 168, 83, 0.4)' : 'rgba(26, 90, 122, 0.35)',
                                }}
                            >
                                Save
                            </Button>
                        </span>
                    </Tooltip>
                </Box>
            )}
        </Box>

        {/* Clear Confirmation Dialog */}
        <Dialog open={showClearConfirm} onClose={() => setShowClearConfirm(false)}>
            <DialogTitle>Clear Loaded Trade Data?</DialogTitle>
            <DialogContent>
                <Typography>
                    This will clear the trade data that was loaded from the URL and remove the URL parameters.
                    Your current trade will remain but won't be linked to the shared URL anymore.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setShowClearConfirm(false)}>Cancel</Button>
                <Button onClick={handleClearTradeData} color="warning" variant="contained">
                    Clear
                </Button>
            </DialogActions>
        </Dialog>

        <FindFillerDialog
            open={showFiller}
            onClose={() => setShowFiller(false)}
            haveTotal={haveTotal}
            wantTotal={wantTotal}
            onAddHave={onAddHaveCard}
            onAddWant={onAddWantCard}
            onAdded={(card, fillSide) => {
                setSnackbar({
                    open: true,
                    message: `Added ${card.name} to ${fillSide === 'have' ? 'your' : 'their'} side`,
                    severity: 'success',
                });
            }}
        />

        <Dialog
            open={showSaveDialog}
            onClose={() => !saving && setShowSaveDialog(false)}
            fullWidth
            maxWidth="xs"
        >
            <DialogTitle>Save Trade</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Name this trade so you can find it in your history.
                </Typography>
                <TextField
                    autoFocus
                    fullWidth
                    label="Trade name"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && tradeName.trim() && !saving) {
                            handleSaveTrade();
                        }
                    }}
                    disabled={saving}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => setShowSaveDialog(false)} disabled={saving}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSaveTrade}
                    disabled={saving || !tradeName.trim()}
                    startIcon={<BookmarkAddIcon />}
                >
                    {saving ? 'Saving…' : 'Save Trade'}
                </Button>
            </DialogActions>
        </Dialog>

        <Dialog
            open={showConfirmDialog}
            onClose={() => !confirming && setShowConfirmDialog(false)}
            fullWidth
            maxWidth="xs"
        >
            <DialogTitle>Confirm Trade</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Giving {haveCardCount} {haveCardCount === 1 ? 'card' : 'cards'} ·
                    {' '}Receiving {wantCardCount} {wantCardCount === 1 ? 'card' : 'cards'}
                </Typography>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={removeGiven}
                            onChange={(e) => setRemoveGiven(e.target.checked)}
                            disabled={haveCardCount === 0 || confirming}
                        />
                    }
                    label={`Remove my ${haveCardCount} given ${haveCardCount === 1 ? 'card' : 'cards'} from Binder`}
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={addReceived}
                            onChange={(e) => setAddReceived(e.target.checked)}
                            disabled={wantCardCount === 0 || confirming}
                        />
                    }
                    label={
                        <Box>
                            <Typography component="span" variant="body1">
                                Add their {wantCardCount} {wantCardCount === 1 ? 'card' : 'cards'} to my Binder
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                                Uncheck for deck-bound pulls
                            </Typography>
                        </Box>
                    }
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => setShowConfirmDialog(false)} disabled={confirming}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleConfirmTrade}
                    disabled={confirming}
                    startIcon={<CheckCircleIcon />}
                >
                    {confirming ? 'Confirming…' : 'Confirm'}
                </Button>
            </DialogActions>
        </Dialog>

        <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
            <Alert
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                severity={snackbar.severity || 'success'}
                variant="filled"
                sx={{ width: '100%' }}
            >
                {snackbar.message}
            </Alert>
        </Snackbar>
        </>
    );
};

export default TradeSummary;
