import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Container,
    Paper,
    Typography,
    Button,
    List,
    ListItem,
    Chip,
    CircularProgress,
    Alert,
    TextField,
    InputAdornment,
    ToggleButtonGroup,
    ToggleButton,
    FormControlLabel,
    Switch,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Search as SearchIcon,
    Style as StyleIcon,
    AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import { Link, useParams } from 'react-router-dom';
import Header from '../components/elements/Header.jsx';
import { CardThumbnail } from '../components/ui/CardImagePreview.jsx';
import { useSets } from '../hooks/useSets.js';
import { useCardData } from '../hooks/useCardData.jsx';
import { useThemeMode } from '../contexts/ThemeContext.jsx';
import { useCardDetail } from '../contexts/CardDetailContext.jsx';
import {
    isSignatureCard,
    isOvernumberedCard,
    isShowcaseCard,
    parseCardVariant,
    rarityColor,
} from '../utils/riftboundCards.js';

const formatMoney = (value) => {
    const num = Number(value);
    if (!isFinite(num) || num <= 0) return '—';
    return `$${num.toFixed(2)}`;
};

const SORT_OPTIONS = [
    { value: 'market-desc', label: 'Market ↓' },
    { value: 'market-asc', label: 'Market ↑' },
    { value: 'low-desc', label: 'Low ↓' },
    { value: 'high-desc', label: 'High ↓' },
    { value: 'name', label: 'Name' },
    { value: 'number', label: '#' },
];

const getSortedCards = (cards, sortMode) => {
    const arr = [...cards];
    switch (sortMode) {
        case 'market-asc':
            return arr.sort((a, b) => (a.marketPrice || 0) - (b.marketPrice || 0));
        case 'low-desc':
            return arr.sort((a, b) => (b.lowPrice || 0) - (a.lowPrice || 0));
        case 'high-desc':
            return arr.sort((a, b) => (b.highPrice || 0) - (a.highPrice || 0));
        case 'name':
            return arr.sort((a, b) => {
                const an = a._baseName || a.name || '';
                const bn = b._baseName || b.name || '';
                const nameCmp = an.localeCompare(bn);
                if (nameCmp !== 0) return nameCmp;
                return (b.marketPrice || 0) - (a.marketPrice || 0);
            });
        case 'number':
            return arr.sort((a, b) => {
                const an = parseInt(String(a.extNumber || '').replace(/\D/g, ''), 10) || 0;
                const bn = parseInt(String(b.extNumber || '').replace(/\D/g, ''), 10) || 0;
                if (an !== bn) return an - bn;
                return (a.isFoil ? 1 : 0) - (b.isFoil ? 1 : 0);
            });
        case 'market-desc':
        default:
            return arr.sort((a, b) => {
                const priceCmp = (b.marketPrice || 0) - (a.marketPrice || 0);
                if (priceCmp !== 0) return priceCmp;
                const an = a._baseName || a.name || '';
                const bn = b._baseName || b.name || '';
                if (an !== bn) return an.localeCompare(bn);
                return (a.isFoil ? 1 : 0) - (b.isFoil ? 1 : 0);
            });
    }
};

const annotateCards = (cards) =>
    cards.map((card) => {
        const { baseName, artVariant } = parseCardVariant(card.name || '');
        return { ...card, _baseName: baseName, _artVariant: artVariant };
    });

const FilterToggle = ({ label, count, singular, plural, checked, onChange, accent, mutedColor, textColor }) => (
    <Box
        sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
        }}
    >
        <FormControlLabel
            control={
                <Switch
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    size="small"
                    sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: accent },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: accent,
                        },
                    }}
                />
            }
            label={
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: textColor }}>
                    {label}
                </Typography>
            }
            sx={{ m: 0 }}
        />
        <Typography sx={{ fontSize: '0.75rem', color: mutedColor, fontStyle: 'italic' }}>
            {checked
                ? `${count} ${count === 1 ? singular : plural} hidden`
                : `${count} ${count === 1 ? singular : plural} included`}
        </Typography>
    </Box>
);

const PriceCell = ({ label, value, isDark, accent = false }) => (
    <Box sx={{ textAlign: 'center', minWidth: { xs: 52, sm: 64 } }}>
        <Typography
            variant="caption"
            sx={{
                display: 'block',
                color: isDark ? 'rgba(160, 196, 212, 0.7)' : 'rgba(26, 74, 110, 0.7)',
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontWeight: 600,
            }}
        >
            {label}
        </Typography>
        <Typography
            variant="body2"
            sx={{
                color: accent
                    ? (isDark ? '#d4a853' : '#1a5a7a')
                    : (isDark ? '#e8f4f8' : '#0a2540'),
                fontWeight: accent ? 700 : 500,
                fontSize: accent ? '0.95rem' : '0.85rem',
                fontVariantNumeric: 'tabular-nums',
            }}
        >
            {formatMoney(value)}
        </Typography>
    </Box>
);

const SetDetail = () => {
    const { setId } = useParams();
    const { getSetById, loading, error } = useSets();
    const { metadata } = useCardData();
    const lastUpdatedTimestamp = metadata?.lastUpdated || metadata?.updatedAt || null;
    const { isDark } = useThemeMode();
    const { openDetail } = useCardDetail();
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

    const [query, setQuery] = useState('');
    const [sortMode, setSortMode] = useState('market-desc');
    const [hideSignatures, setHideSignatures] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem('riftrades-hide-signatures') === 'true';
    });
    const [hideOvernumbered, setHideOvernumbered] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem('riftrades-hide-overnumbered') === 'true';
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem('riftrades-hide-signatures', String(hideSignatures));
    }, [hideSignatures]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem('riftrades-hide-overnumbered', String(hideOvernumbered));
    }, [hideOvernumbered]);

    const set = useMemo(() => getSetById(setId), [getSetById, setId]);

    const annotated = useMemo(() => (set ? annotateCards(set.cards) : []), [set]);

    const signatureCount = useMemo(
        () => annotated.filter(isSignatureCard).length,
        [annotated]
    );
    const overnumberedCount = useMemo(
        () => annotated.filter(isOvernumberedCard).length,
        [annotated]
    );
    const showcaseCount = useMemo(
        () => annotated.filter(isShowcaseCard).length,
        [annotated]
    );

    const visibleCards = useMemo(() => {
        const toggled = annotated.filter((c) => {
            if (hideSignatures && isSignatureCard(c)) return false;
            if (hideOvernumbered && isOvernumberedCard(c)) return false;
            return true;
        });

        const q = query.trim().toLowerCase();
        const filtered = q
            ? toggled.filter((c) => {
                const name = (c.name || '').toLowerCase();
                const num = (c.extNumber || '').toLowerCase();
                const rarity = (c.extRarity || '').toLowerCase();
                const sub = (c.subTypeName || '').toLowerCase();
                const variant = (c._artVariant || '').toLowerCase();
                return (
                    name.includes(q) ||
                    num.includes(q) ||
                    rarity.includes(q) ||
                    sub.includes(q) ||
                    variant.includes(q)
                );
            })
            : toggled;

        return getSortedCards(filtered, sortMode);
    }, [annotated, query, sortMode, hideSignatures, hideOvernumbered]);

    const bgGradient = isDark
        ? 'linear-gradient(135deg, #061825 0%, #0a2540 50%, #0d3050 100%)'
        : 'linear-gradient(135deg, #e8f4f8 0%, #d0e8f0 50%, #c0dce8 100%)';
    const textColor = isDark ? '#e8f4f8' : '#0a2540';
    const mutedColor = isDark ? '#a0c4d4' : '#1a4a6e';
    const accent = isDark ? '#d4a853' : '#1a5a7a';
    const paperBg = isDark ? 'rgba(13, 48, 80, 0.6)' : '#ffffff';
    const paperBorder = isDark ? 'rgba(212, 168, 83, 0.2)' : 'rgba(26, 90, 122, 0.15)';

    const openCard = (card) => {
        if (card?._uniqueId) openDetail(card);
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                pb: '28px',
                background: bgGradient,
                backgroundAttachment: 'fixed',
            }}
        >
            <Header lastUpdatedTimestamp={lastUpdatedTimestamp} />

            <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
                <Button
                    component={Link}
                    to="/sets"
                    startIcon={<ArrowBackIcon />}
                    sx={{
                        mb: 2,
                        color: accent,
                        background: 'transparent',
                        '&:hover': {
                            background: isDark ? 'rgba(212, 168, 83, 0.15)' : 'rgba(26, 90, 122, 0.08)',
                        },
                    }}
                >
                    All sets
                </Button>

                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress sx={{ color: accent }} />
                    </Box>
                )}

                {!loading && error && (
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                )}

                {!loading && !error && !set && (
                    <Alert severity="warning">Set not found.</Alert>
                )}

                {!loading && set && (
                    <>
                        <Box sx={{ mb: 2 }}>
                            <Typography
                                variant="h4"
                                sx={{
                                    fontWeight: 700,
                                    color: textColor,
                                    fontSize: { xs: '1.5rem', md: '2rem' },
                                }}
                            >
                                {set.name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <StyleIcon sx={{ fontSize: 14, color: mutedColor }} />
                                    <Typography variant="caption" sx={{ color: mutedColor }}>
                                        {set.cards.length} printings
                                        {signatureCount > 0 ? ` · ${signatureCount} signatures` : ''}
                                        {overnumberedCount > 0 ? ` · ${overnumberedCount} overnumbered` : ''}
                                        {showcaseCount > 0 ? ` · ${showcaseCount} showcase` : ''}
                                    </Typography>
                                </Box>
                                {set.topMarketPrice > 0 && (
                                    <Chip
                                        size="small"
                                        label={`Top ${formatMoney(set.topMarketPrice)}`}
                                        sx={{
                                            height: 22,
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            color: isDark ? '#0a2540' : '#ffffff',
                                            background: isDark
                                                ? 'linear-gradient(135deg, #e5c078 0%, #d4a853 100%)'
                                                : 'linear-gradient(135deg, #1a5a7a 0%, #2a7a9a 100%)',
                                        }}
                                    />
                                )}
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: { xs: 'column', sm: 'row' },
                                gap: 1.5,
                                mb: 1.5,
                                alignItems: { xs: 'stretch', sm: 'center' },
                            }}
                        >
                            <TextField
                                placeholder="Filter cards..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                size="small"
                                sx={{
                                    flexGrow: 1,
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: paperBg,
                                        '& fieldset': { borderColor: paperBorder },
                                    },
                                    '& input': { color: textColor },
                                }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: mutedColor, fontSize: 18 }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={sortMode}
                                onChange={(_, v) => v && setSortMode(v)}
                                sx={{
                                    flexWrap: 'wrap',
                                    '& .MuiToggleButton-root': {
                                        textTransform: 'none',
                                        color: mutedColor,
                                        borderColor: paperBorder,
                                        '&.Mui-selected': {
                                            backgroundColor: isDark
                                                ? 'rgba(212, 168, 83, 0.25)'
                                                : 'rgba(26, 90, 122, 0.12)',
                                            color: accent,
                                            fontWeight: 700,
                                        },
                                    },
                                }}
                            >
                                {SORT_OPTIONS.map((opt) => (
                                    <ToggleButton key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                        </Box>

                        {(signatureCount > 0 || overnumberedCount > 0) && (
                            <Paper
                                elevation={0}
                                sx={{
                                    mb: 2,
                                    p: 1.5,
                                    backgroundColor: paperBg,
                                    border: `1px solid ${paperBorder}`,
                                    borderRadius: 2,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0.5,
                                }}
                            >
                                {signatureCount > 0 && (
                                    <FilterToggle
                                        label="Hide signature cards"
                                        count={signatureCount}
                                        singular="signature"
                                        plural="signatures"
                                        checked={hideSignatures}
                                        onChange={setHideSignatures}
                                        accent={accent}
                                        mutedColor={mutedColor}
                                        textColor={textColor}
                                    />
                                )}
                                {overnumberedCount > 0 && (
                                    <FilterToggle
                                        label="Hide overnumbered cards"
                                        count={overnumberedCount}
                                        singular="overnumbered card"
                                        plural="overnumbered cards"
                                        checked={hideOvernumbered}
                                        onChange={setHideOvernumbered}
                                        accent={accent}
                                        mutedColor={mutedColor}
                                        textColor={textColor}
                                    />
                                )}
                            </Paper>
                        )}

                        <Paper
                            elevation={0}
                            sx={{
                                backgroundColor: paperBg,
                                border: `1px solid ${paperBorder}`,
                                borderRadius: 2,
                                overflow: 'hidden',
                            }}
                        >
                            <List disablePadding>
                                {visibleCards.length === 0 && (
                                    <ListItem>
                                        <Typography variant="body2" sx={{ color: mutedColor, py: 2 }}>
                                            No cards match your filter.
                                        </Typography>
                                    </ListItem>
                                )}
                                {visibleCards.map((card, idx) => {
                                    const isSig = isSignatureCard(card);
                                    const isOver = isOvernumberedCard(card);
                                    const isShow = isShowcaseCard(card);
                                    const hasSpecial = isSig || isOver || isShow || card.isFoil;
                                    const rColor = rarityColor(card.extRarity, isDark);

                                    return (
                                        <ListItem
                                            key={card._uniqueId || `${card.productId}-${card.subTypeName}-${idx}`}
                                            sx={{
                                                px: { xs: 1.25, sm: 2 },
                                                py: 1.25,
                                                gap: 1.5,
                                                position: 'relative',
                                                borderBottom: idx === visibleCards.length - 1
                                                    ? 'none'
                                                    : `1px solid ${isDark ? 'rgba(212, 168, 83, 0.12)' : 'rgba(26, 90, 122, 0.08)'}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                '&::before': hasSpecial
                                                    ? {
                                                        content: '""',
                                                        position: 'absolute',
                                                        left: 0,
                                                        top: 0,
                                                        bottom: 0,
                                                        width: 3,
                                                        background: isSig
                                                            ? (isDark ? '#c084fc' : '#9333ea')
                                                            : isOver
                                                                ? (isDark ? '#fb923c' : '#ea580c')
                                                                : isShow
                                                                    ? (isDark ? '#f472b6' : '#db2777')
                                                                    : accent,
                                                    }
                                                    : undefined,
                                            }}
                                        >
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: mutedColor,
                                                    fontVariantNumeric: 'tabular-nums',
                                                    width: 28,
                                                    textAlign: 'right',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {idx + 1}
                                            </Typography>

                                            <CardThumbnail
                                                imageUrl={card.imageUrl}
                                                fallbackUrl={card.imageUrlFallback}
                                                alt={card.name}
                                                size={isSmall ? 34 : 42}
                                                onClick={() => openCard(card)}
                                            />

                                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                <Typography
                                                    component={card._uniqueId ? 'button' : 'span'}
                                                    type={card._uniqueId ? 'button' : undefined}
                                                    onClick={card._uniqueId ? () => openCard(card) : undefined}
                                                    aria-label={card._uniqueId ? `View details for ${card.name}` : undefined}
                                                    variant="body2"
                                                    sx={{
                                                        color: textColor,
                                                        fontWeight: 600,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        border: 0,
                                                        background: 'none',
                                                        p: 0,
                                                        m: 0,
                                                        textAlign: 'left',
                                                        fontFamily: 'inherit',
                                                        cursor: card._uniqueId ? 'pointer' : 'default',
                                                    }}
                                                >
                                                    {card._baseName || card.name}
                                                </Typography>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        gap: 0.5,
                                                        flexWrap: 'wrap',
                                                        mt: 0.35,
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    {card.extNumber && (
                                                        <Typography
                                                            variant="caption"
                                                            sx={{ color: mutedColor, fontSize: '0.7rem' }}
                                                        >
                                                            #{card.extNumber}
                                                        </Typography>
                                                    )}
                                                    {card.extRarity && (
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: rColor,
                                                                fontSize: '0.7rem',
                                                                fontWeight: 700,
                                                                textTransform: 'uppercase',
                                                            }}
                                                        >
                                                            · {card.extRarity}
                                                        </Typography>
                                                    )}
                                                    {card.isFoil && (
                                                        <Chip
                                                            icon={
                                                                <AutoAwesomeIcon
                                                                    sx={{ fontSize: '0.7rem !important' }}
                                                                />
                                                            }
                                                            size="small"
                                                            label="Foil"
                                                            sx={{
                                                                height: 18,
                                                                fontSize: '0.65rem',
                                                                fontWeight: 700,
                                                                color: isDark ? '#0a2540' : '#ffffff',
                                                                background:
                                                                    'linear-gradient(135deg, #e5c078 0%, #d4a853 50%, #b8892e 100%)',
                                                                '& .MuiChip-icon': {
                                                                    color: isDark ? '#0a2540' : '#ffffff',
                                                                    ml: 0.5,
                                                                },
                                                                '& .MuiChip-label': { px: 0.75 },
                                                            }}
                                                        />
                                                    )}
                                                    {isSig && (
                                                        <Chip
                                                            size="small"
                                                            label="Signature"
                                                            sx={{
                                                                height: 18,
                                                                fontSize: '0.65rem',
                                                                fontWeight: 700,
                                                                color: '#ffffff',
                                                                background: isDark
                                                                    ? 'linear-gradient(135deg, #c084fc 0%, #9333ea 100%)'
                                                                    : 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                                                                '& .MuiChip-label': { px: 0.75 },
                                                            }}
                                                        />
                                                    )}
                                                    {isOver && (
                                                        <Chip
                                                            size="small"
                                                            label="Overnumbered"
                                                            sx={{
                                                                height: 18,
                                                                fontSize: '0.65rem',
                                                                fontWeight: 700,
                                                                color: '#ffffff',
                                                                background: isDark
                                                                    ? 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)'
                                                                    : 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                                                                '& .MuiChip-label': { px: 0.75 },
                                                            }}
                                                        />
                                                    )}
                                                    {isShow && !isSig && !isOver && (
                                                        <Chip
                                                            size="small"
                                                            label="Showcase"
                                                            sx={{
                                                                height: 18,
                                                                fontSize: '0.65rem',
                                                                fontWeight: 700,
                                                                color: '#ffffff',
                                                                background: isDark
                                                                    ? 'linear-gradient(135deg, #f472b6 0%, #db2777 100%)'
                                                                    : 'linear-gradient(135deg, #db2777 0%, #be185d 100%)',
                                                                '& .MuiChip-label': { px: 0.75 },
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            </Box>

                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    gap: { xs: 0.75, sm: 2 },
                                                    alignItems: 'center',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <PriceCell label="Market" value={card.marketPrice} isDark={isDark} accent />
                                                <PriceCell label="Low" value={card.lowPrice} isDark={isDark} />
                                                <PriceCell label="High" value={card.highPrice} isDark={isDark} />
                                            </Box>
                                        </ListItem>
                                    );
                                })}
                            </List>
                        </Paper>
                    </>
                )}
            </Container>
        </Box>
    );
};

export default SetDetail;
