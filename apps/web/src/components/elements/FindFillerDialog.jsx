import React, { useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Typography,
    IconButton,
    CircularProgress,
    List,
    ListItemButton,
    ListItemText,
    Divider,
    Chip
} from '@mui/material';
import {
    Close as CloseIcon,
    Balance as BalanceIcon,
    Sort as SortIcon,
    CheckCircleOutline as CheckCircleOutlineIcon,
    Add as AddIcon
} from '@mui/icons-material';
import { foilTagStyle } from '../../utils/foilStyle.js';
import { useThemeMode } from '../../contexts/ThemeContext.jsx';
import { usePriceType } from '../../contexts/PriceContext.jsx';
import { useCardData } from '../../hooks/useCardData.jsx';
import { CardThumbnail } from '../ui/CardImagePreview.jsx';
import { formatCurrency } from '../../utils/helpers.js';
import {
    getFillerGap,
    findFillerMatches,
    getClosenessLabel
} from '../../utils/findFiller.js';
import { capture } from '../../lib/analytics.js';

const formatCardType = (subTypeName) => {
    if (!subTypeName) return null;
    const type = subTypeName.toLowerCase();
    if (type.includes('pack foil')) return 'Pack Foil';
    if (type.includes('nexus night')) return 'Nexus Night';
    if (type.includes('foil')) return 'Foil';
    if (type.includes('promo')) return 'Promo';
    if (type.includes('normal')) return null;
    return subTypeName;
};

const FindFillerDialog = ({
    open,
    onClose,
    haveTotal,
    wantTotal,
    onAddHave,
    onAddWant,
    onAdded
}) => {
    const { isDark } = useThemeMode();
    const { priceSource } = usePriceType();
    const { cards, getCardPrice, loading, dataReady } = useCardData();

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

    const { target, balanced, fillSide, sideIsMine } = useMemo(
        () => getFillerGap(haveTotal, wantTotal),
        [haveTotal, wantTotal]
    );

    const matches = useMemo(() => {
        if (balanced || !dataReady || !cards?.length) return [];
        return findFillerMatches(cards, target, getCardPrice);
    }, [balanced, dataReady, cards, target, getCardPrice]);

    const handleAdd = (card) => {
        const option = {
            label: card.displayName || card.name,
            card
        };
        if (fillSide === 'have') {
            onAddHave(option);
        } else {
            onAddWant(option);
        }
        capture('filler_card_added', {
            side: fillSide,
            card_name: card.name,
            target_gap: target,
        });
        onAdded?.(card, fillSide);
    };

    const textColor = 'text.primary';
    const mutedColor = 'text.secondary';

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            scroll="paper"
            sx={{
                '& .MuiDialog-paper': {
                    maxHeight: '80vh'
                }
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    pr: 1,
                    pb: 1
                }}
            >
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'action.selected',
                        flexShrink: 0
                    }}
                >
                    <BalanceIcon sx={{ color: 'primary.main' }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        variant="h4"
                        component="h2"
                        sx={{ color: textColor, lineHeight: 1.2 }}
                    >
                        Find Trade Filler
                    </Typography>
                    <Typography variant="body2" sx={{ color: mutedColor, mt: 0.25 }}>
                        {balanced
                            ? 'This trade is already even.'
                            : `${sideIsMine ? 'Your' : 'Their'} side needs ${formatPrice(target)} more to balance.`}
                    </Typography>
                </Box>
                <IconButton
                    onClick={onClose}
                    aria-label="close"
                    size="small"
                    sx={{ color: mutedColor }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ px: 0, py: 0 }}>
                {balanced ? (
                    <Box
                        sx={{
                            py: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 1
                        }}
                    >
                        <CheckCircleOutlineIcon
                            sx={{ fontSize: 40, color: 'success.main' }}
                        />
                        <Typography variant="body2" sx={{ color: textColor }}>
                            Nothing to fill — the trade is balanced.
                        </Typography>
                    </Box>
                ) : loading && (!cards || cards.length === 0) ? (
                    <Box sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress size={32} />
                    </Box>
                ) : (
                    <>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                                px: 2,
                                py: 1,
                                color: mutedColor
                            }}
                        >
                            <SortIcon sx={{ fontSize: 16 }} />
                            <Typography variant="caption">Closest matches first</Typography>
                        </Box>

                        {matches.length === 0 ? (
                            <Box sx={{ py: 4, px: 2, textAlign: 'center' }}>
                                <Typography variant="body2" sx={{ color: textColor }}>
                                    No priced cards available to suggest.
                                </Typography>
                            </Box>
                        ) : (
                            <List disablePadding>
                                {matches.map((match, index) => {
                                    const cardType = formatCardType(match.card.subTypeName);
                                    const setName = match.card._setName || '';
                                    const closeness = getClosenessLabel(
                                        match,
                                        target,
                                        formatPrice
                                    );

                                    return (
                                        <React.Fragment key={match.card._uniqueId || index}>
                                            {index > 0 && <Divider component="li" />}
                                            <ListItemButton
                                                onClick={() => handleAdd(match.card)}
                                                sx={{
                                                    alignItems: 'center',
                                                    gap: 1.25,
                                                    py: 1,
                                                    px: 2,
                                                    '&:hover': {
                                                        bgcolor: 'action.hover'
                                                    }
                                                }}
                                            >
                                                <CardThumbnail
                                                    imageUrl={match.card.imageUrl}
                                                    alt={match.card.name}
                                                    size={40}
                                                />
                                                <ListItemText
                                                    primary={
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 0.75,
                                                                minWidth: 0
                                                            }}
                                                        >
                                                            <Typography
                                                                sx={{
                                                                    fontSize: '0.85rem',
                                                                    fontWeight: 600,
                                                                    color: textColor,
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis'
                                                                }}
                                                            >
                                                                {match.card.name}
                                                            </Typography>
                                                            {cardType && (
                                                                <Chip
                                                                    label={cardType}
                                                                    size="small"
                                                                    sx={{
                                                                        height: 18,
                                                                        fontSize: '0.55rem',
                                                                        fontWeight: 600,
                                                                        ...(foilTagStyle(cardType, isDark) || {
                                                                            bgcolor: 'action.hover',
                                                                            color: 'text.secondary',
                                                                        }),
                                                                        '& .MuiChip-label': {
                                                                            px: 0.5
                                                                        },
                                                                        flexShrink: 0
                                                                    }}
                                                                />
                                                            )}
                                                        </Box>
                                                    }
                                                    secondary={
                                                        <Box
                                                            component="span"
                                                            sx={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: 0.15,
                                                                mt: 0.15
                                                            }}
                                                        >
                                                            {setName && (
                                                                <Typography
                                                                    component="span"
                                                                    variant="caption"
                                                                    sx={{
                                                                        color: 'text.secondary',
                                                                        lineHeight: 1.2
                                                                    }}
                                                                >
                                                                    {setName}
                                                                </Typography>
                                                            )}
                                                            <Typography
                                                                component="span"
                                                                variant="caption"
                                                                sx={{
                                                                    color: mutedColor,
                                                                    lineHeight: 1.2
                                                                }}
                                                            >
                                                                {closeness}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                    sx={{ my: 0, flex: 1, minWidth: 0 }}
                                                />
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.5,
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    <Typography
                                                        sx={{
                                                            fontSize: '0.8rem',
                                                            fontWeight: 700,
                                                            color: 'text.primary',
                                                            fontVariantNumeric: 'tabular-nums'
                                                        }}
                                                    >
                                                        {formatPrice(match.price)}
                                                    </Typography>
                                                    <AddIcon
                                                        sx={{
                                                            fontSize: 18,
                                                            color: 'primary.main'
                                                        }}
                                                    />
                                                </Box>
                                            </ListItemButton>
                                        </React.Fragment>
                                    );
                                })}
                            </List>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default FindFillerDialog;
